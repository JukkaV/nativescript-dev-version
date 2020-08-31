'use strict';
const env_switcher_android_1 = require('./env-switcher.android');
const env_switcher_ios_1 = require('./env-switcher.ios');
const hookArgReader = (args) => {
    if (typeof args !== 'string') {
        return Object.keys(args)[0];
    } else {
        return args;
    }
};

module.exports = function ($logger, $projectData, hookArgs) {
    const platformName = (
        hookArgs.platform ||
        (hookArgs.prepareData && hookArgs.prepareData.platform)
    ).toLowerCase();
    const platformsData = getPlatformsData($injector);
    const platformData = platformsData.getPlatformData(platformName);
    // const platformData = $platformsDataService.getPlatformData(platformName, projectData);
    const androidResourcesMigrationService = $injector.resolve('androidResourcesMigrationService');

    let environmentName;
    let envSwitcher;

    if (hookArgs && hookArgs.env && hookArgs.env.environment) {
        environmentName = hookArgReader(hookArgs.env.environment);
    } else {
        environmentName = 'development';
    }

    $logger.info('Env: ', hookArgs.env, $projectData);

    if (platformName === 'android') {
        envSwitcher = new env_switcher_android_1.EnvSwitcherAndroid(androidResourcesMigrationService, $logger, platformData, $projectData, environmentName, platformName);
    } else if (platformName === 'ios') {
        envSwitcher = new env_switcher_ios_1.EnvSwitcherIOS($logger, platformData, $projectData, environmentName, platformName);
    } else {
        $logger.warn(`Platform '${platformName}' isn't supported: skipping environment copy... `);

        return;
    }

    envSwitcher.run();
};

function getPlatformsData($injector) {
    try {
        return $injector.resolve('platformsData');
    } catch (err) {
        return $injector.resolve('platformsDataService');
    }
}
