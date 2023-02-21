import { PlatformAccessory } from 'homebridge';
import { ADAXHomebridgePlatform } from './platform';
export declare class ADAXPlatformAccessory {
    private readonly platform;
    private readonly accessory;
    private service;
    private roomState;
    constructor(platform: ADAXHomebridgePlatform, accessory: PlatformAccessory);
    getRoom(): Promise<any>;
    targetPrecision(number: number): number;
    currentPrecision(number: number): number;
    currentHeatingState(): number;
    targetHeatingState(): 1 | 0;
    handleCurrentHeatingCoolingStateGet(callback: any): void;
    handleTargetHeatingCoolingStateGet(callback: any): void;
    handleTargetHeatingCoolingStateSet(value: any, callback: any): void;
    handleCurrentTemperatureGet(callback: any): void;
    handleTemperatureDisplayUnitsGet(callback: any): void;
    handleTargetTemperatureGet(callback: any): void;
    handleTargetTemperatureSet(value: any, callback: any): void;
}
//# sourceMappingURL=platformAccessory.d.ts.map