const { withAndroidManifest, AndroidConfig, withDangerousMod } = require('expo/config-plugins');
const { generateImageAsync } = require('@expo/image-utils');
const fs = require('fs');
const path = require('path');

const META_LARGE_ICON = 'expo.modules.notifications.large_notification_icon';
const RESOURCE_NAME = 'notification_large_icon';
const RESOURCE = `@drawable/${RESOURCE_NAME}`;
const SOURCE_ICON = 'assets/images/icon.png';

const DPI = {
  mdpi: 64,
  hdpi: 96,
  xhdpi: 128,
  xxhdpi: 192,
  xxxhdpi: 256,
};

async function writeLargeIcons(projectRoot) {
  const src = path.join(projectRoot, SOURCE_ICON);
  await Promise.all(
    Object.entries(DPI).map(async ([dpi, size]) => {
      const folder = path.join(projectRoot, 'android/app/src/main/res', `drawable-${dpi}`);
      fs.mkdirSync(folder, { recursive: true });
      const { source } = await generateImageAsync(
        { projectRoot, cacheType: 'android-notification-large' },
        {
          src,
          width: size,
          height: size,
          resizeMode: 'cover',
          backgroundColor: '#F3E6D8',
        }
      );
      fs.writeFileSync(path.join(folder, `${RESOURCE_NAME}.png`), source);
    })
  );
}

function withNotificationLargeIcon(config) {
  config = withDangerousMod(config, [
    'android',
    async (mod) => {
      await writeLargeIcons(mod.modRequest.projectRoot);
      return mod;
    },
  ]);

  return withAndroidManifest(config, (mod) => {
    const main = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      main,
      META_LARGE_ICON,
      RESOURCE,
      'resource'
    );
    return mod;
  });
}

module.exports = withNotificationLargeIcon;
