// Extends app.json with values that come from the build environment.
// GOOGLE_MAPS_ANDROID_API_KEY is set as an EAS environment variable so the key stays out of git.
module.exports = ({ config }) => ({
    ...config,
    android: {
        ...config.android,
        config: {
            ...config.android?.config,
            googleMaps: {
                apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
            },
        },
    },
});
