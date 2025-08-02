/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Handle three.js
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      use: {
        loader: 'file-loader',
      },
    });
    return config;
  },
};

module.exports = nextConfig;
