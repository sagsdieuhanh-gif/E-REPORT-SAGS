const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(__dirname+'/../app/modules/roster-lite.v5.js','utf8');

{
  const start=source.indexOf('function normalizeFlightSearch(');
  const end=source.indexOf("document.addEventListener('input'",start);
  assert(start>0&&end>start,'unified search block missing');
  let input={value:' vj-1 '};
  const cards=['VJ1','VZ1'].map(text=>({hidden:false,querySelector:()=>({textContent:text})}));
  const list={classList:{contains:()=>false},querySelectorAll:()=>cards};
  const c={document:{getElementById:id=>id==='sagsFlightSearch'?input:list}};
  vm.createContext(c);vm.runInContext(source.slice(start,end),c);
  c.applyFlightSearch();
  assert.equal(cards[0].hidden,false);
  assert.equal(cards[1].hidden,true);
  input.value='';
  c.applyFlightSearch();
  assert(cards.every(x=>!x.hidden));
}

{
  const searchStart=source.indexOf('function normalizeFlightSearch(');
  const searchEnd=source.indexOf("document.addEventListener('input'",searchStart);
  const roleStart=source.indexOf('function v478ApplyRoleFilter(){',searchEnd);
  const roleEnd=source.indexOf('function v478EnsureTabs(',roleStart);
  assert(searchStart>0&&searchEnd>searchStart&&roleStart>searchEnd&&roleEnd>roleStart,'AD unified search block missing');
  let input={value:'VN 123'};
  const mk=(title,state)=>({hidden:false,dataset:{v478State:state},querySelector:sel=>sel.includes('Title')?{textContent:title}:null,textContent:title});
  const pendingCard=mk('VJ834','pending'),completedCard=mk('VN123','completed');
  const tabsBox={hidden:false},owner={hidden:false},empty={hidden:true,textContent:''};
  const tabBtns=[];
  const list={
    classList:{contains:x=>x==='v478CanonicalQueue'},
    querySelectorAll:sel=>{
      if(sel==='.fwcFlight,.v1199Card')return[pendingCard,completedCard];
      if(sel==='.v478CanonicalRoleCard')return[pendingCard,completedCard];
      if(sel==='[data-v478-tab]')return tabBtns;
      return[];
    },
    querySelector:sel=>sel===':scope > .v478RoleTabs'?tabsBox:sel===':scope > .v478RoleOwner'?owner:sel==='.v478RoleEmpty'?empty:null
  };
  const c={document:{getElementById:id=>id==='fwcList'?list:id==='sagsFlightSearch'?input:null}};
  vm.createContext(c);vm.runInContext("let v478RoleTab='pending';function v478CardState(){return 'pending'};"+source.slice(searchStart,searchEnd)+source.slice(roleStart,roleEnd),c);
  c.applyFlightSearch();
  assert.equal(pendingCard.hidden,true,'AD search must hide non-matching flight');
  assert.equal(completedCard.hidden,false,'AD search must show matching flight only, regardless of status tab');
  assert.equal(tabsBox.hidden,true,'AD status tabs must hide while searching');
  assert.equal(owner.hidden,true,'AD owner/status note must hide while searching');
  input.value='';
  c.applyFlightSearch();
  assert.equal(tabsBox.hidden,false,'clearing search restores status tabs');
  assert.equal(owner.hidden,false,'clearing search restores status note');
  assert.equal(pendingCard.hidden,false,'clearing search restores pending tab');
  assert.equal(completedCard.hidden,true,'clearing search restores normal tab filtering');
}

assert.match(source,/document\.addEventListener\('search',e=>\{if\(e\.target\?\.id==='sagsFlightSearch'\)applyFlightSearch\(\)\}/);
assert.doesNotMatch(source,/scrollIntoView\(/);
console.log('Flight search passed: all roles use one filter-only behavior; AD search hides tabs and shows matching cards only.');

assert.match(source, /v478CanonicalRoleCard\[hidden\]\{display:none!important\}/,'hidden AD cards must beat display:flex!important');
