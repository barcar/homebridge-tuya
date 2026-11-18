import BaseAccessory from './BaseAccessory';
import { configureOn } from './characteristic/On';
import { configureMotionDetected } from './characteristic/MotionDetected';
import { configureLight } from './characteristic/Light';

const SCHEMA_CODE = {
  ON: ['switch_led'],
  BRIGHTNESS: ['bright_value', 'bright_value_v2'],
  COLOR_TEMP: ['temp_value', 'temp_value_v2'],
  COLOR: ['colour_data', 'colour_data_v2'],
  WORK_MODE: ['work_mode'],
  PIR: ['pir_state'],
  PIR_ON: ['switch_pir'],
  POWER_SWITCH: ['switch'],
};

export default class LightAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ON];
  }

  checkRequirements() {
    if (this.device.schema.some(schema => /^(switch(?:_led)?|bright_value|temp_value)(?:_v|_)?\d+$/.test(schema.code))) {
      return true;
    }

    return super.checkRequirements();
  }

  private getChannelServiceName(index: number) {
    return `${this.device.name} Channel ${index}`;
  }

  private getMultiChannelLightConfigs() {
    const config = this.platform.getDeviceConfig(this.device);
    const requestedChannelIndex = this.accessory.context.channelIndex;

    if (config?.splitMultiChannelLightsAsAccessories !== true) {
      return [];
    }

    if (requestedChannelIndex === undefined) {
      return [];
    }

    const channelMap = new Map<number, {
      on?: ReturnType<BaseAccessory['getSchema']>;
      bright?: ReturnType<BaseAccessory['getSchema']>;
      temp?: ReturnType<BaseAccessory['getSchema']>;
    }>();

    for (const schema of this.device.schema) {
      const numberedMatch = schema.code.match(/^(switch(?:_led)?|bright_value|temp_value)(?:_v|_)?(\d+)$/);
      if (numberedMatch) {
        const [, kind, rawIndex] = numberedMatch;
        const index = Number(rawIndex);
        const channelConfig = channelMap.get(index) ?? {};
        if (kind === 'switch' || kind === 'switch_led') {
          channelConfig.on = schema;
        } else if (kind === 'bright_value') {
          channelConfig.bright = schema;
        } else if (kind === 'temp_value') {
          channelConfig.temp = schema;
        }
        channelMap.set(index, channelConfig);
        continue;
      }

      if (schema.code === 'switch_1') {
        const channelConfig = channelMap.get(1) ?? {};
        channelConfig.on = schema;
        channelMap.set(1, channelConfig);
        continue;
      }

      if (schema.code === 'bright_value' || schema.code === 'temp_value') {
        const channelConfig = channelMap.get(1) ?? {};
        if (schema.code === 'bright_value') {
          channelConfig.bright = schema;
        }
        if (schema.code === 'temp_value') {
          channelConfig.temp = schema;
        }
        channelMap.set(1, channelConfig);
      }
    }

    const mappedConfigs = [...channelMap.entries()]
      .filter(([, config]) => config.on || config.bright || config.temp)
      .sort((a, b) => a[0] - b[0])
      .map(([index, config]) => ({
        index,
        on: config.on,
        bright: config.bright,
        temp: config.temp,
      }));

    const filteredConfigs = requestedChannelIndex !== undefined
      ? mappedConfigs.filter(config => config.index === Number(requestedChannelIndex))
      : mappedConfigs;

    if (filteredConfigs.length > 0) {
      this.log.debug('Multi-channel light mapping: %o', filteredConfigs.map(config => ({
        index: config.index,
        on: config.on?.code,
        bright: config.bright?.code,
        temp: config.temp?.code,
      })));
    }

    return filteredConfigs;
  }

  configureServices() {
    const multiChannelConfigs = this.getMultiChannelLightConfigs();
    if (multiChannelConfigs.length > 0) {
      const oldService = this.accessory.getService(this.Service.Lightbulb);
      if (oldService && oldService.subtype === undefined) {
        this.platform.log.warn('Detected stale cached single-light accessory for a multi-channel DP device. Remove the cached accessory and restart Homebridge.');
        this.platform.log.warn('Legacy service UUID: %s', oldService.UUID);
        this.platform.log.warn('Multi-channel mapping: %o', multiChannelConfigs.map(config => ({
          index: config.index,
          on: config.on?.code,
          bright: config.bright?.code,
          temp: config.temp?.code,
        })));
        this.platform.log.warn('Remove old single light service:', oldService.UUID);
        this.accessory.removeService(oldService);
      }

      this.accessory.services
        .filter(service => service.subtype?.startsWith('light-channel-'))
        .forEach(service => {
          this.accessory.removeService(service);
        });

      const workModeSchema = this.device.schema.find(
        schema => schema.code === 'work_mode' && this.getStatus(schema.code),
      );

      for (const config of multiChannelConfigs) {
        const name = this.getChannelServiceName(config.index);
        const subtype = `light-channel-${config.index}`;
        const service = this.accessory.getService(subtype)
          || this.accessory.addService(this.Service.Lightbulb, name, subtype);

        configureLight(
          this,
          service,
          config.on,
          config.bright,
          config.temp,
          undefined,
          workModeSchema,
        );
      }
    } else {
      const service = this.accessory.getService(this.Service.Lightbulb)
        || this.accessory.addService(this.Service.Lightbulb);

      configureLight(
        this,
        service,
        this.getSchema(...SCHEMA_CODE.ON),
        this.getSchema(...SCHEMA_CODE.BRIGHTNESS),
        this.getSchema(...SCHEMA_CODE.COLOR_TEMP),
        this.getSchema(...SCHEMA_CODE.COLOR),
        this.getSchema(...SCHEMA_CODE.WORK_MODE),
      );
    }

    // PIR
    configureOn(this, undefined, this.getSchema(...SCHEMA_CODE.PIR_ON));
    configureMotionDetected(this, undefined, this.getSchema(...SCHEMA_CODE.PIR));

    // RGB Power Switch
    configureOn(this, undefined, this.getSchema(...SCHEMA_CODE.POWER_SWITCH));
  }

}
