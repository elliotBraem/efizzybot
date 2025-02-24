import fs from "fs/promises";
import path from "path";
import {
  AppConfig,
  FeedConfig,
  PluginConfig,
  PluginsConfig,
} from "../../types/config";
import { hydrateConfigValues } from "../../utils/config";
import { logger } from "../../utils/logger";

export const isProduction = process.env.NODE_ENV === "production";
export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig | null = null;
  private configPath: string;

  private constructor() {
    if (isProduction) {
      this.configPath = path.resolve(__dirname, "../../curate.config.json");
      logger.info("Using production configuration");
    } else {
      // Use test config in development mode
      this.configPath = path.resolve(
        __dirname,
        "../../curate.config.test.json",
      );
      logger.info("Using test configuration");
    }
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public async loadConfig(): Promise<AppConfig> {
    try {
      const rawConfig = await this.getRawConfig();
      const hydratedConfig = hydrateConfigValues(rawConfig);
      this.config = hydratedConfig;
      return hydratedConfig;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load config: ${message}`);
    }
  }

  public getConfig(): AppConfig {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }
    return this.config;
  }

  public setConfigPath(path: string): void {
    this.configPath = path;
  }

  public async getRawConfig(): Promise<AppConfig> {
    try {
      const configFile = await fs.readFile(this.configPath, "utf-8");
      return JSON.parse(configFile) as AppConfig;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load raw config: ${message}`);
    }
  }

  // Switch to a different config (if saving locally, wouldn't work in fly.io container)
  public async updateConfig(newConfig: AppConfig): Promise<void> {
    // saving this for later
    try {
      await fs.writeFile(this.configPath, JSON.stringify(newConfig, null, 2));
      this.config = newConfig;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update config: ${message}`);
    }
  }

  public getPluginRegistry(): PluginsConfig {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }
    const config = this.getConfig();
    return config.plugins;
  }

  public getPluginByName(pluginName: string): PluginConfig | undefined {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }
    const plugins = this.getPluginRegistry();
    return plugins[pluginName];
  }

  public getFeedConfig(feedId: string): FeedConfig | undefined {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }
    const config = this.getConfig();
    return config.feeds.find(
      (feed) => feed.id.toLowerCase() === feedId.toLowerCase(),
    );
  }
}
