const fs = require('fs');
const file = process.argv[2];
const data = fs.readFileSync(file);
(async () => {
  try {
    const mod = require('pdf-parse');
    if (typeof mod === 'function') {
      const d = await mod(data);
      console.log(d.text);
      return;
    }
    if (mod.PDFParse) {
      const parser = new mod.PDFParse({ data });
      const d = await parser.getText();
      console.log(d.text);
      return;
    }
    const d = await mod(data);
    console.log(d.text);
  } catch (e) {
    console.error('ERR', e.message);
    process.exit(1);
  }
})();
