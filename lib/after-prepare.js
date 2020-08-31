const fs = require('fs');
const AndroidManifest = require('androidmanifest');
const iOSPList = require('plist');

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
    if (platform === 'android') {
        const manifest = new AndroidManifest().readFile(
            platformData.configurationFilePath
        );

        // transforms e.g. "1.2.3" into 102003.
        let versionCode = appVersion.split('.').reduce(
            (acc, v, i, a) => acc + v * Math.pow(10, (a.length - i - 1) * 2),
            0
        );

        // transforms e.g. "1.2.3" into 1002003.
        // let versionCode = appVersion
        // .split('.')
        // .reduce(
        //     (acc, v, i, a) => acc + v.substr(0, v.indexOf('-') === -1 ? v.length : v.indexOf('-')) * 1000 * (a.length - i - 1), 0
        // );

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
        plist.CFBundleShortVersionString = appVersion;
        plist.CFBundleVersion = appVersionNumber;
        fs.writeFileSync(platformData.configurationFilePath, iOSPList.build(plist));
    }
};

function getPlatformsData($injector) {
    try {
        return $injector.resolve('platformsData');
    } catch (err) {
        return $injector.resolve('platformsDataService');
    }
}
