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

  private getMultiChannelLightConfigs() {
    const channelMap = new Map<number, {
      on?: ReturnType<BaseAccessory['getSchema']>;
      bright?: ReturnType<BaseAccessory['getSchema']>;
      temp?: ReturnType<BaseAccessory['getSchema']>;
    }>();

    for (const schema of this.device.schema) {
      const match = schema.code.match(/^(switch(?:_led)?|bright_value|temp_value)(?:_v|_)?(\d+)$/);
      if (!match) {
        continue;
      }

      const [, kind, rawIndex] = match;
      const index = Number(rawIndex);
      const config = channelMap.get(index) ?? {};
      if (kind === 'switch' || kind === 'switch_led') {
        config.on = schema;
      } else if (kind === 'bright_value') {
        config.bright = schema;
      } else if (kind === 'temp_value') {
        config.temp = schema;
      }
      channelMap.set(index, config);
    }

    return [...channelMap.entries()]
      .filter(([, config]) => config.on || config.bright || config.temp)
      .sort((a, b) => a[0] - b[0])
      .map(([index, config]) => ({
        index,
        on: config.on,
        bright: config.bright,
        temp: config.temp,
      }));
  }

  configureServices() {
    const multiChannelConfigs = this.getMultiChannelLightConfigs();
    if (multiChannelConfigs.length > 0) {
      const oldService = this.accessory.getService(this.Service.Lightbulb);
      if (oldService && oldService.subtype === undefined) {
        this.platform.log.warn('Remove old single light service:', oldService.UUID);
        this.accessory.removeService(oldService);
      }

      for (const config of multiChannelConfigs) {
        const name = `${this.device.name} ${config.index}`;
        const service = this.accessory.getService(`light-channel-${config.index}`)
          || this.accessory.addService(this.Service.Lightbulb, name, `light-channel-${config.index}`);

        configureLight(
          this,
          service,
          config.on,
          config.bright,
          config.temp,
          undefined,
          this.getSchema(...SCHEMA_CODE.WORK_MODE),
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
