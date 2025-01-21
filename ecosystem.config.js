module.exports = {
    apps: [
      {
        name: "server",
        script: "server.ts",
        interpreter: "tsx",
        cwd: "/home/linuxuser/splat-brush",
        env: {
          NODE_ENV: "production",
        },
      },
    ],
};