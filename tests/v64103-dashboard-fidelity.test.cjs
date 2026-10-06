const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'app/modules/aviation-reference.v1.js'),'utf8');
const css=fs.readFileSync(path.join(root,'app/styles/aviation-reference.v1.css'),'utf8');

assert.match(home,/function tableLogoHtml\(code\)/,'table-specific bare airline logo helper missing');
assert.match(home,/class="opsTableLogoBare"/,'bare logo image class missing');
assert.match(home,/opsAirlineCell'\+tableLogoHtml|opsAirlineCell">'\+tableLogoHtml/,'flight table must use bare airline logo helper');
assert.doesNotMatch(home,/opsAirlineCell'\+logoHtml\(alias,'opsTableLogo'\)/,'flight table must not wrap logos in the generic logo card');

assert.match(home,/metricCardHtml\('working','Chuyến đang làm'/);
assert.match(home,/metricCardHtml\('complete','Đã hoàn thành hôm nay'/);
assert.match(home,/metricCardHtml\('pending','Chờ xử lý'/);
assert.match(home,/class="opsMetricCta"/);

assert.match(css,/V6\.4\.103 · DASHBOARD FIDELITY/);
assert.match(css,/#opsHomeMetrics>\.opsMetricCard/);
assert.match(css,/\.opsMetricIcon/);
assert.match(css,/\.opsMetricGhost/);
assert.match(css,/\.opsTableLogoBare/);
assert.match(css,/background:transparent!important/,'bare table logo must not receive a card background');
assert.match(css,/#opsHomeQueue \.opsQueueActions/);
assert.match(css,/#opsHomeFlights \.opsOpenCell button/);

console.log('V6.4.103 dashboard fidelity regression passed');
