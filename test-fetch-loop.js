(async () => {
  let bytes = 0;
  const start = Date.now();
  let active = 0;
  
  async function dl() {
    if (Date.now() - start > 10000) return;
    active++;
    try {
      const res = await fetch('https://speed.cloudflare.com/__down?bytes=25000000', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) {
        const reader = res.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
        }
      } else {
        console.log('Status:', res.status);
      }
    } catch(err) {
      console.error(err);
    }
    active--;
    if (Date.now() - start <= 10000) dl();
  }

  for(let i=0; i<4; i++) dl();

  const timer = setInterval(() => {
    const elapsed = (Date.now() - start)/1000;
    console.log('Mbps:', ((bytes * 8) / elapsed / 1000000).toFixed(2));
    if (elapsed > 10) {
      clearInterval(timer);
      console.log('Done');
    }
  }, 1000);
})();
