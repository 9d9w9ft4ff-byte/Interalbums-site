module.exports = {
  async rewrites() {
    return [
      {
        source: '/share/album/:slug',
        destination: '/api/share/album/:slug',
      },
    ];
  },
};
