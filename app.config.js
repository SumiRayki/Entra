const IS_DEV = process.env.APP_VARIANT === 'development'

module.exports = {
    expo: {
        name: IS_DEV ? 'Entra (DEV)' : 'Entra',
        newArchEnabled: true,
        slug: 'entra',
        version: '0.1.3',
        orientation: 'default',
        icon: './assets/images/icon.png',
        scheme: 'entra',
        userInterfaceStyle: 'automatic',
        assetBundlePatterns: ['**/*'],
        ios: {
            icon: {
                dark: './assets/images/ios-dark.png',
                light: './assets/images/ios-light.png',
                tinted: './assets/images/icon.png',
            },
            supportsTablet: true,
            package: IS_DEV ? 'com.entra.app.dev' : 'com.entra.app',
            bundleIdentifier: IS_DEV ? 'com.entra.app.dev' : 'com.entra.app',
        },
        android: {
            adaptiveIcon: {
                foregroundImage: './assets/images/adaptive-icon-foreground.png',
                backgroundImage: './assets/images/adaptive-icon-background.png',
                monochromeImage: './assets/images/adaptive-icon-foreground.png',
                backgroundColor: '#F9F9F9',
            },
            edgeToEdgeEnabled: true,
            package: IS_DEV ? 'com.entra.app.dev' : 'com.entra.app',
            userInterfaceStyle: 'light',
            permissions: [],
        },
        web: {
            bundler: 'metro',
            output: 'static',
            favicon: './assets/images/adaptive-icon.png',
        },
        plugins: [
            [
                'expo-build-properties',
                {
                    android: {
                        largeHeap: true,
                        usesCleartextTraffic: true,
                        enableProguardInReleaseBuilds: true,
                        enableShrinkResourcesInReleaseBuilds: true,
                    },
                },
            ],
            [
                'expo-splash-screen',
                {
                    backgroundColor: '#F9F9F9',
                    image: './assets/images/adaptive-icon.png',
                    imageWidth: 200,
                },
            ],
            'expo-localization',
            'expo-router',
            'expo-sqlite',
            './expo-build-plugins/usercert.plugin.js',
        ],
        experiments: {
            typedRoutes: true,
            reactCompiler: true,
        },
        extra: {
            router: {
                origin: false,
            },
        },
    },
}
