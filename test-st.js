const speedTest = require('speedtest-net');

(async () => {
  try {
    console.log("Starting speed test...");
    const result = await speedTest({
      acceptLicense: true,
      acceptGdpr: true,
      progress: (event) => {
        console.log(event);
      }
    });
    console.log("Final:", result);
  } catch (err) {
    console.error(err.message);
  }
})();
