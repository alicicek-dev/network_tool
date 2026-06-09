(async () => {
  const start = Date.now();
  const res = await fetch('https://speed.cloudflare.com/__down?bytes=25000000');
  console.log('Status Code:', res.status);
  
  if (res.ok) {
    let bytes = 0;
    const reader = res.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
    }
    
    console.log('Total bytes:', bytes, 'Time:', Date.now() - start);
  } else {
    console.log('Failed:', await res.text());
  }
})();
