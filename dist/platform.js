"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADAXHomebridgePlatform = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const moment_1 = __importDefault(require("moment"));
const settings_1 = require("./settings");
const platformAccessory_1 = require("./platformAccessory");
class ADAXHomebridgePlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.accessories = [];
        this.baseUrl = 'https://api-1.adax.no/client-api';
        this.token = {
            access_token: '',
            refresh_token: '',
            expires_in: 0,
            expiry_date: 0,
        };
        this.homeStamp = moment_1.default().subtract(1, 'd');
        this.homeState = { rooms: [] };
        this.planned = [];
        this.queue = [];
        this.log.debug('Finished initializing platform:', this.config.name, 'conf', this.config);
        this.api.on('didFinishLaunching', () => {
            log.debug('Executed didFinishLaunching callback');
            this.discoverDevices();
        });
        this.setState = this.setState.bind(this);
        setInterval(this.setState, 3000);
    }
    setState() {
        const pollingInterval = this.config.maxPollingInterval;
        if (this.queue.length > 0) {
            this.getToken().then(token => {
                return node_fetch_1.default(`${this.baseUrl}/rest/v1/control`, {
                    method: 'POST',
                    body: JSON.stringify({
                        rooms: this.planned,
                    }),
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
            }).then(() => {
                return this.getHome(true, true, true).then(() => {
                    this.updateQueue();
                });
            });
        }
        else if (moment_1.default().isAfter(moment_1.default(this.homeStamp).add(pollingInterval, 's'))) {
            return this.getHome(true, true).then(() => {
                this.updateQueue();
            });
        }
    }
    getToken() {
        if (moment_1.default.unix(this.token.expiry_date).isAfter(moment_1.default())) {
            return Promise.resolve(this.token.access_token);
        }
        return node_fetch_1.default(`${this.baseUrl}/auth/token`, {
            method: 'POST',
            body: `grant_type=password&username=${this.config.clientId}&password=${this.config.secret}`,
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
            },
        }).then((res) => {
            if (!res.ok) {
                throw res;
            }
            return res.json();
        }).then((json) => {
            this.token = json;
            this.token.expiry_date = moment_1.default().add(this.token.expires_in, 's').unix();
            return Promise.resolve(this.token.access_token);
        }).catch((error) => {
            error.text().then((text) => {
                this.log.error(`Could not authenticate with error: ${text}`);
            });
        });
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    _getHome(delay = 0) {
        return this.sleep(delay).then(() => {
            return this.getToken().then(token => {
                return node_fetch_1.default(`${this.baseUrl}/rest/v1/content`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            });
        });
    }
    getHome(useIdeal = true, setPlanned = false, force = false) {
        if (force || moment_1.default(this.homeStamp).add(60, 's').isAfter(moment_1.default())) {
            return Promise.resolve(this.idealState());
        }
        const secondInterval = moment_1.default().seconds() % 3;
        const delay = secondInterval > 0 ? secondInterval * 1000 : 0;
        return this._getHome(delay).then((res) => {
            if (res.status === 429) {
                return this._getHome(3000);
            }
            return Promise.resolve(res);
        }).then((res) => {
            return res.text();
        }).then((text) => {
            try {
                const json = JSON.parse(text);
                return Promise.resolve(json);
            }
            catch (_a) {
                return Promise.reject(`JSON rejected with following response: ${text}`);
            }
        }).then((home) => {
            this.homeStamp = moment_1.default();
            this.homeState = home;
            if (setPlanned) {
                this.planned = this.cleanRooms(home.rooms);
            }
            return useIdeal ? this.idealState() : home;
        }).catch(() => {
            return Promise.resolve(this.idealState());
        });
    }
    updateQueue() {
        this.queue = this.queue.filter((room) => {
            const current = this.homeState.rooms.find(currentRoom => {
                return currentRoom.id === room.id;
            });
            if (current === undefined) {
                return false;
            }
            return room.targetTemperature !== (current === null || current === void 0 ? void 0 : current.targetTemperature);
        });
    }
    idealState() {
        const ideal = this.homeState;
        ideal.rooms.forEach((room, idx) => {
            const id = ideal.rooms[idx].id;
            const planned = this.planned.find((room) => room.id === id);
            if (planned) {
                ideal.rooms[idx].targetTemperature = planned.targetTemperature;
            }
        });
        return ideal;
    }
    setRoom(id, state) {
        const index = this.homeState.rooms.findIndex((room) => room.id === id);
        if (index !== undefined) {
            this.planned[index] = {
                id: id,
                ...state,
            };
            this.queue = this.planned;
        }
        return Promise.resolve({
            id: id,
            ...state,
        });
    }
    cleanRooms(rooms) {
        return rooms.map((room) => {
            return {
                id: room.id,
                targetTemperature: room.targetTemperature,
                heatingEnabled: room.heatingEnabled,
            };
        });
    }
    configureAccessory(accessory) {
        this.log.info('Loading accessory from cache:', accessory.displayName);
        this.accessories.push(accessory);
    }
    discoverDevices() {
        this.getHome(false, true).then((home) => {
            for (const device of home.rooms) {
                const uuid = this.api.hap.uuid.generate(`${device.id}`);
                const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
                if (existingAccessory) {
                    if (device) {
                        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
                        new platformAccessory_1.ADAXPlatformAccessory(this, existingAccessory);
                        this.api.updatePlatformAccessories([existingAccessory]);
                    }
                    else if (!device) {
                        this.api.unregisterPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [existingAccessory]);
                        this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
                    }
                }
                else {
                    this.log.info('Adding new accessory:', device.name);
                    const accessory = new this.api.platformAccessory(device.name, uuid);
                    accessory.context.device = device;
                    new platformAccessory_1.ADAXPlatformAccessory(this, accessory);
                    this.api.registerPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
                }
            }
        });
    }
}
exports.ADAXHomebridgePlatform = ADAXHomebridgePlatform;
//# sourceMappingURL=platform.js.map