/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { API, PlatformAccessory } from 'homebridge';
import LightAccessory from '../src/accessory/LightAccessory';
import SwitchAccessory from '../src/accessory/SwitchAccessory';
import TuyaDevice, { TuyaDeviceSchemaMode, TuyaDeviceSchemaType } from '../src/device/TuyaDevice';
import { TuyaPlatform } from '../src/platform';

const mockConfigureLight = jest.fn();

jest.mock('../src/accessory/characteristic/Light', () => ({
  configureLight: (...args: any[]) => mockConfigureLight(...args),
}));

jest.mock('../src/accessory/characteristic/On', () => ({
  configureOn: jest.fn(),
}));

jest.mock('../src/accessory/characteristic/MotionDetected', () => ({
  configureMotionDetected: jest.fn(),
}));

describe('LightAccessory', () => {
  let mockPlatform: any;
  let mockAccessory: any;
  let mockAPI: any;
  let mockDeviceManager: any;

  beforeEach(() => {
    mockConfigureLight.mockClear();

    mockAPI = {
      hap: {
        Service: {
          AccessoryInformation: 'AccessoryInformation',
          Lightbulb: 'Lightbulb',
          Battery: 'Battery',
        },
        Characteristic: {
          Manufacturer: 'Manufacturer',
          Model: 'Model',
          Name: 'Name',
          ConfiguredName: 'ConfiguredName',
          SerialNumber: 'SerialNumber',
          StatusLowBattery: { BATTERY_LEVEL_NORMAL: 0, BATTERY_LEVEL_LOW: 1 },
          BatteryLevel: 'BatteryLevel',
          ChargingState: { NOT_CHARGING: 0, CHARGING: 1 },
          StatusActive: 'StatusActive',
          On: 'On',
          Brightness: 'Brightness',
          ColorTemperature: 'ColorTemperature',
          Hue: 'Hue',
          Saturation: 'Saturation',
        },
      },
      user: {
        persistPath: jest.fn(() => '/mock/path'),
      },
    } as unknown as API;

    mockDeviceManager = {
      getDevice: jest.fn(),
      sendCommands: jest.fn(),
    };

    mockPlatform = {
      api: mockAPI,
      Service: mockAPI.hap.Service,
      Characteristic: mockAPI.hap.Characteristic,
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
      options: {
        debug: false,
        debugLevel: '',
      },
      deviceManager: mockDeviceManager,
      getDeviceConfig: jest.fn(() => undefined),
      getDeviceSchemaConfig: jest.fn(() => undefined),
    } as unknown as TuyaPlatform;

    mockAccessory = {
      UUID: 'mock-uuid',
      displayName: 'Kitchen 3-channel driver',
      context: { deviceID: 'test-device-id' },
      services: [],
      getService: jest.fn((name: string) => {
        return mockAccessory.services.find((s: any) => s.displayName === name || s.UUID === name || s.subtype === name);
      }),
      addService: jest.fn((serviceType: any, name?: string, subtype?: string) => {
        const service = {
          UUID: subtype || name || 'mock-service',
          displayName: name || 'Mock Service',
          subtype,
          characteristics: [],
          getCharacteristic: jest.fn(() => ({
            onGet: jest.fn().mockReturnThis(),
            onSet: jest.fn().mockReturnThis(),
            setProps: jest.fn().mockReturnThis(),
            updateValue: jest.fn().mockReturnThis(),
            value: undefined,
          })),
          setCharacteristic: jest.fn().mockReturnThis(),
          addOptionalCharacteristic: jest.fn().mockReturnThis(),
          testCharacteristic: jest.fn(() => false),
        };
        mockAccessory.services.push(service);
        return service;
      }),
      removeService: jest.fn((service: any) => {
        mockAccessory.services = mockAccessory.services.filter((s: any) => s !== service);
      }),
    } as unknown as PlatformAccessory;
  });

  test('keeps the default light as a single service unless channel splitting is explicitly enabled', () => {
    const device = new TuyaDevice({
      id: 'test-device-id',
      uuid: 'uuid',
      name: 'Kitchen 3-channel driver',
      online: true,
      product_id: 'abc',
      product_name: '3 channel CCT Driver',
      model: '3 channel CCT Driver',
      category: 'dj',
      schema: [
        { code: 'switch_led', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'work_mode', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Enum, property: { range: ['white', 'colour'] } },
        { code: 'switch_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'switch_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'switch_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
      ],
      status: [
        { code: 'switch_led', value: true },
        { code: 'switch_1', value: true },
        { code: 'bright_value_1', value: 200 },
        { code: 'temp_value_1', value: 300 },
        { code: 'switch_2', value: true },
        { code: 'bright_value_2', value: 250 },
        { code: 'temp_value_2', value: 350 },
        { code: 'switch_3', value: true },
        { code: 'bright_value_3', value: 300 },
        { code: 'temp_value_3', value: 400 },
      ],
    } as Partial<TuyaDevice> as TuyaDevice);

    mockDeviceManager.getDevice.mockReturnValue(device);

    const accessory = new LightAccessory(mockPlatform, mockAccessory as unknown as PlatformAccessory);
    accessory.configureServices();

    expect(mockConfigureLight).toHaveBeenCalledTimes(1);
    expect((mockConfigureLight.mock.calls as any[])[0][1].displayName).not.toContain('Channel');
  });

  test('uses the selected channel accessory when splitMultiChannelLightsAsAccessories is enabled', () => {
    const device = new TuyaDevice({
      id: 'test-device-id',
      uuid: 'uuid',
      name: 'Kitchen 3-channel driver',
      online: true,
      product_id: 'abc',
      product_name: '3 channel CCT Driver',
      model: '3 channel CCT Driver',
      category: 'dj',
      schema: [
        { code: 'switch_led', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'work_mode', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Enum, property: { range: ['white', 'colour'] } },
        { code: 'switch_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'switch_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'switch_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
      ],
      status: [
        { code: 'switch_led', value: true },
        { code: 'switch_1', value: true },
        { code: 'bright_value_1', value: 200 },
        { code: 'temp_value_1', value: 300 },
        { code: 'switch_2', value: true },
        { code: 'bright_value_2', value: 250 },
        { code: 'temp_value_2', value: 350 },
        { code: 'switch_3', value: true },
        { code: 'bright_value_3', value: 300 },
        { code: 'temp_value_3', value: 400 },
      ],
    } as Partial<TuyaDevice> as TuyaDevice);

    mockPlatform.getDeviceConfig.mockReturnValue({ id: 'test-device-id', splitMultiChannelLightsAsAccessories: true });
    mockDeviceManager.getDevice.mockReturnValue(device);

    mockAccessory.context.channelIndex = 2;
    const accessory = new LightAccessory(mockPlatform, mockAccessory as unknown as PlatformAccessory);
    accessory.configureServices();

    expect(mockConfigureLight).toHaveBeenCalledTimes(1);
    expect((mockConfigureLight.mock.calls as any[])[0][1].displayName).toBe('Kitchen 3-channel driver Channel 2');
    expect((mockConfigureLight.mock.calls as any[])[0][2].code).toBe('switch_2');
  });

  test('maps switch_led as a master while channel 1 uses switch_1 and the unnumbered bright/temp values', () => {
    const device = new TuyaDevice({
      id: 'test-device-id',
      uuid: 'uuid',
      name: 'Kitchen 3-channel driver',
      online: true,
      product_id: 'abc',
      product_name: '3 channel CCT Driver',
      model: '3 channel CCT Driver',
      category: 'dj',
      schema: [
        { code: 'switch_led', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'switch_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'switch_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'switch_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
      ],
      status: [
        { code: 'switch_led', value: true },
        { code: 'switch_1', value: true },
        { code: 'bright_value', value: 220 },
        { code: 'temp_value', value: 320 },
        { code: 'switch_2', value: false },
        { code: 'bright_value_2', value: 180 },
        { code: 'temp_value_2', value: 280 },
        { code: 'switch_3', value: true },
        { code: 'bright_value_3', value: 300 },
        { code: 'temp_value_3', value: 400 },
      ],
    } as Partial<TuyaDevice> as TuyaDevice);

    mockPlatform.getDeviceConfig.mockReturnValue({ id: 'test-device-id', splitMultiChannelLightsAsAccessories: true });
    mockDeviceManager.getDevice.mockReturnValue(device);

    mockAccessory.context.channelIndex = 1;
    const accessory = new LightAccessory(mockPlatform, mockAccessory as unknown as PlatformAccessory);
    accessory.configureServices();

    expect(mockConfigureLight).toHaveBeenCalledTimes(1);
    expect((mockConfigureLight.mock.calls as any[])[0][1].displayName).toBe('Kitchen 3-channel driver Channel 1');
    expect((mockConfigureLight.mock.calls as any[])[0][2].code).toBe('switch_1');
    expect((mockConfigureLight.mock.calls as any[])[0][3].code).toBe('bright_value');
    expect((mockConfigureLight.mock.calls as any[])[0][4].code).toBe('temp_value');
  });

  test('accepts DP mode channel-only lights without a master switch_led', () => {
    const device = new TuyaDevice({
      id: 'test-device-id',
      uuid: 'uuid',
      name: 'Kitchen 3-channel driver',
      online: true,
      product_id: 'abc',
      product_name: '3 channel CCT Driver',
      model: '3 channel CCT Driver',
      category: 'dj',
      schema: [
        { code: 'switch_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'switch_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
      ],
      status: [
        { code: 'switch_1', value: true },
        { code: 'bright_value_1', value: 220 },
        { code: 'temp_value_1', value: 320 },
        { code: 'switch_2', value: false },
        { code: 'bright_value_2', value: 180 },
        { code: 'temp_value_2', value: 280 },
      ],
    } as Partial<TuyaDevice> as TuyaDevice);

    mockPlatform.getDeviceConfig.mockReturnValue({ id: 'test-device-id', splitMultiChannelLightsAsAccessories: true });
    mockDeviceManager.getDevice.mockReturnValue(device);

    const accessory = new LightAccessory(mockPlatform, mockAccessory as unknown as PlatformAccessory);
    expect(accessory.checkRequirements()).toBe(true);
  });

  test('uses only switch_led for the master accessory when a multi-channel light is split', () => {
    const device = new TuyaDevice({
      id: 'test-device-id',
      uuid: 'uuid',
      name: 'Kitchen 3-channel driver',
      online: true,
      product_id: 'abc',
      product_name: '3 channel CCT Driver',
      model: '3 channel CCT Driver',
      category: 'dj',
      schema: [
        { code: 'switch_led', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'switch_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'switch_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'switch_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'bright_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'bright_value_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'temp_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'temp_value_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
      ],
      status: [
        { code: 'switch_led', value: true },
        { code: 'switch_1', value: true },
        { code: 'switch_2', value: true },
        { code: 'switch_3', value: true },
      ],
    } as Partial<TuyaDevice> as TuyaDevice);

    mockDeviceManager.getDevice.mockReturnValue(device);
    mockAccessory.context.channelIndex = 'master';
    const accessory = new SwitchAccessory(mockPlatform, mockAccessory as unknown as PlatformAccessory);
    accessory.configureServices();

    const masterSwitchCalls = mockAccessory.addService.mock.calls.filter((call: any[]) => call[2] === 'switch_led');
    const numberedSwitchCalls = mockAccessory.addService.mock.calls.filter((call: any[]) => /^switch_\d+$/.test(call[2]));

    expect(masterSwitchCalls).toHaveLength(1);
    expect(masterSwitchCalls[0][1]).toBe('Kitchen 3 channel driver');
    expect(numberedSwitchCalls).toHaveLength(0);
  });

  test('keeps a single light when splitMultiChannelLightsAsAccessories is not enabled for that device', () => {
    const device = new TuyaDevice({
      id: 'test-device-id',
      uuid: 'uuid',
      name: 'Kitchen 3-channel driver',
      online: true,
      product_id: 'abc',
      product_name: '3 channel CCT Driver',
      model: '3 channel CCT Driver',
      category: 'dj',
      schema: [
        { code: 'switch_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'switch_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'switch_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
      ],
      status: [
        { code: 'switch_1', value: true },
        { code: 'bright_value_1', value: 200 },
        { code: 'temp_value_1', value: 300 },
        { code: 'switch_2', value: true },
        { code: 'bright_value_2', value: 250 },
        { code: 'temp_value_2', value: 350 },
        { code: 'switch_3', value: true },
        { code: 'bright_value_3', value: 300 },
        { code: 'temp_value_3', value: 400 },
      ],
    } as Partial<TuyaDevice> as TuyaDevice);

    mockPlatform.getDeviceConfig.mockReturnValue({ id: 'test-device-id', splitMultiChannelLightsAsAccessories: false });
    mockDeviceManager.getDevice.mockReturnValue(device);

    const accessory = new LightAccessory(mockPlatform, mockAccessory as unknown as PlatformAccessory);
    accessory.configureServices();

    expect(mockConfigureLight).toHaveBeenCalledTimes(1);
    expect((mockConfigureLight.mock.calls as any[])[0][1].displayName).not.toContain('Channel');
  });

  test('keeps the upstream single-light behavior for larger DP-mode channel counts unless accessory split mode is enabled', () => {
    const device = new TuyaDevice({
      id: 'test-device-id',
      uuid: 'uuid',
      name: 'Kitchen 5-channel driver',
      online: true,
      product_id: 'abc',
      product_name: '5 channel CCT Driver',
      model: '5 channel CCT Driver',
      category: 'dj',
      schema: [
        { code: 'switch_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_1', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'switch_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_2', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'switch_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_3', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'switch_4', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_4', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_4', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
        { code: 'switch_5', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Boolean, property: {} },
        { code: 'bright_value_5', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 10, max: 1000, scale: 0, step: 1, unit: '%' } },
        { code: 'temp_value_5', mode: TuyaDeviceSchemaMode.READ_WRITE, type: TuyaDeviceSchemaType.Integer, property: { min: 0, max: 1000, scale: 0, step: 1, unit: 'K' } },
      ],
      status: [
        { code: 'switch_1', value: true },
        { code: 'bright_value_1', value: 100 },
        { code: 'temp_value_1', value: 200 },
        { code: 'switch_2', value: false },
        { code: 'bright_value_2', value: 150 },
        { code: 'temp_value_2', value: 250 },
        { code: 'switch_3', value: true },
        { code: 'bright_value_3', value: 200 },
        { code: 'temp_value_3', value: 300 },
        { code: 'switch_4', value: true },
        { code: 'bright_value_4', value: 250 },
        { code: 'temp_value_4', value: 350 },
        { code: 'switch_5', value: true },
        { code: 'bright_value_5', value: 300 },
        { code: 'temp_value_5', value: 400 },
      ],
    } as Partial<TuyaDevice> as TuyaDevice);

    mockPlatform.getDeviceConfig.mockReturnValue({ id: 'test-device-id' });
    mockDeviceManager.getDevice.mockReturnValue(device);

    const accessory = new LightAccessory(mockPlatform, mockAccessory as unknown as PlatformAccessory);
    accessory.configureServices();

    expect(mockConfigureLight).toHaveBeenCalledTimes(1);
    expect((mockConfigureLight.mock.calls as any[])[0][1].displayName).not.toContain('Channel');
  });
});
