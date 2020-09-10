'use strict';
const fs = require('fs');
const AndroidManifest = require('androidmanifest');
const iOSPList = require('plist');
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
    const appPackage = require($projectData.projectFilePath);
    const appVersion =
        (appPackage.nativescript && appPackage.nativescript.version) ||
        appPackage.version;
    let appVersionNumber =
        (appPackage.nativescript && appPackage.nativescript.versionNumber) ||
        appPackage.versionNumber;
    if (!appVersion) {
        $logger.warn(
            'Nativescript version is not defined. Skipping set native package version.'
        );
        return;
    }

    const platformsData = getPlatformsData($injector);
    const platform = (
        hookArgs.platform ||
        (hookArgs.prepareData && hookArgs.prepareData.platform)
    ).toLowerCase();
    $logger.info(`Platform: ${platform}`);

    const platformData = platformsData.getPlatformData(platform);
    $logger.info(
        `platformData.configurationFilePath: ${platformData.configurationFilePath}`
    );

    const androidResourcesMigrationService = $injector.resolve('androidResourcesMigrationService');
    let environmentName;
    let envSwitcher;

    if (hookArgs && hookArgs.release) {
        environmentName = hookArgReader('release');
    } else if (hookArgs.prepareData && hookArgs.prepareData.release) {
        environmentName = hookArgReader('release');
    } else if (hookArgs && hookArgs.env && hookArgs.env.environment) {
        environmentName = hookArgReader(hookArgs.env.environment);
    } else if (hookArgs.prepareData && hookArgs.prepareData.env && hookArgs.prepareData.env.environment) {
        environmentName = hookArgReader(hookArgs.prepareData.env.environment);
    } else {
        environmentName = 'development';
    }

    if (platform === 'android') {
        const manifest = new AndroidManifest().readFile(
            platformData.configurationFilePath
        );

        envSwitcher = new env_switcher_android_1.EnvSwitcherAndroid(androidResourcesMigrationService, $logger, platformData, $projectData, environmentName, platform);

        // transforms e.g. "1.2.3" into 10203.
        let versionCode;

        versionCode = appVersion.split('.').reduce(
            (previousValue, currentValue, i, a) => {
                let betaIndex;

                if (i > 2) {
                    // Loop only first 3 version codes
                    return previousValue;
                }

                betaIndex = currentValue.indexOf('-');

                if (-1 !== betaIndex) {
                    currentValue = currentValue.substr(0, betaIndex);
                }

                return previousValue + currentValue * Math.pow(10, (a.length - i - 1) * 2);
            },
            0
        );

        if (appVersionNumber) {
            versionCode =
                versionCode * 100 +
                (appVersionNumber < 10 ? '0' : '') + // left pad appVersionNumber
                appVersionNumber;
        }

        manifest.$('manifest').attr('android:versionCode', versionCode);
        manifest.$('manifest').attr('android:versionName', appVersion);
        manifest.writeFile(platformData.configurationFilePath);
    } else if (platform === 'ios') {
        const plist = iOSPList.parse(
            fs.readFileSync(platformData.configurationFilePath, 'utf8')
        );

        envSwitcher = new env_switcher_ios_1.EnvSwitcherIOS($logger, platformData, $projectData, environmentName, platform);

        plist.CFBundleShortVersionString = appVersion;
        plist.CFBundleVersion = appVersionNumber;
        fs.writeFileSync(platformData.configurationFilePath, iOSPList.build(plist));
    }

    envSwitcher.changeAppName();
};

function getPlatformsData($injector) {
    try {
        return $injector.resolve('platformsData');
    } catch (err) {
        return $injector.resolve('platformsDataService');
    }
}
