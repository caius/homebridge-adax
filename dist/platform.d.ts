import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import moment from 'moment';
export declare class ADAXHomebridgePlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly config: PlatformConfig;
    readonly api: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    readonly accessories: PlatformAccessory[];
    baseUrl: string;
    token: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        expiry_date: number;
    };
    homeStamp: moment.Moment;
    homeState: Home;
    planned: Array<Room>;
    queue: Array<Room>;
    constructor(log: Logger, config: PlatformConfig, api: API);
    setState(): Promise<void> | undefined;
    getToken(): any;
    sleep(ms: number): Promise<unknown>;
    _getHome(delay?: number): Promise<any>;
    getHome(useIdeal?: boolean, setPlanned?: boolean, force?: boolean): Promise<any>;
    updateQueue(): void;
    idealState(): Home;
    setRoom(id: any, state: Record<string, unknown>): Promise<{
        id: any;
    }>;
    cleanRooms(rooms: any): any;
    configureAccessory(accessory: PlatformAccessory): void;
    discoverDevices(): void;
}
interface Home {
    rooms: Array<Room>;
}
interface Room {
    id: number;
    heatingEnabled?: boolean;
    temperature?: number;
    targetTemperature?: number;
}
export {};
//# sourceMappingURL=platform.d.ts.map