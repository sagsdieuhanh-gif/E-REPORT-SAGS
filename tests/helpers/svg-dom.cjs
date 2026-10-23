'use strict';
// Minimal DOM with real fragment move/removal semantics, for canonical SVG draws.
function svgDOM(){
 const stats={created:0,replaced:0,inserted:0,removed:0},pages=new Map();
 class Node{
  constructor(type=1,tag=''){this.nodeType=type;this.tagName=tag;this.childNodes=[];this.parentNode=null;this.dataset={};this.style={};this.attrs={};this.handlers={}}
  get nodes(){return this.childNodes.filter(n=>n.nodeType!==8)}
  get ownerSVGElement(){let p=this.parentNode;while(p){if(p.tagName==='svg')return p;p=p.parentNode}return null}
  appendChild(n){if(n.nodeType===11){for(const x of [...n.childNodes])this.appendChild(x);return n}n.remove();this.childNodes.push(n);n.parentNode=this;return n}
  insertBefore(n,anchor){if(n.nodeType===11){for(const x of [...n.childNodes])this.insertBefore(x,anchor);return n}const i=this.childNodes.indexOf(anchor);if(i<0)throw Error('missing anchor');n.remove();this.childNodes.splice(i,0,n);n.parentNode=this;stats.inserted++;return n}
  replaceChildren(...nodes){stats.replaced++;for(const n of [...this.childNodes])n.remove();for(const n of nodes)this.appendChild(n)}
  remove(){if(this.parentNode){const i=this.parentNode.childNodes.indexOf(this);this.parentNode.childNodes.splice(i,1);this.parentNode=null;stats.removed++}}
  setAttribute(k,v){this.attrs[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v)}
  getAttribute(k){return this.attrs[k]??null}
  addEventListener(t,f){this.handlers[t]=f}
  closest(){return this}
  setPointerCapture(){}
  releasePointerCapture(){}
 }
 const createPage=n=>{const p=new Node(1,'svg');pages.set('svg'+n,p);return p};
 const document={documentElement:{lang:'vi',dir:'ltr'},fonts:{status:'loaded',size:0,addEventListener(){}},getElementById:id=>pages.get(id)||null,createDocumentFragment:()=>new Node(11),createComment:()=>new Node(8),createElement:()=>({getContext:()=>({font:'',measureText:s=>({width:String(s).length*8})})})};
 const E=(tag,attrs={})=>{stats.created++;const n=new Node(1,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n};
 return {stats,pages,createPage,document,E,Node};
}
module.exports={svgDOM};
