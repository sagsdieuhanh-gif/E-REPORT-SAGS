/* E-REPORT/SAGS V3.57 · Mobile-first compact interface with two-row toolbar.
 * Presentation-only module: it does not read or write Firebase and it keeps
 * every existing button handler, permission check and business flow unchanged.
 */
(function(root){
"use strict";
if(root.__SAGS_V357_MOBILE_UI_LOADED)return;
root.__SAGS_V357_MOBILE_UI_LOADED=true;

const BUILD="V3.57-20260822-01";

function ensureStyle(){
  if(document.getElementById("v351CompactToolbarStyle"))return;
  const st=document.createElement("style");
  st.id="v351CompactToolbarStyle";
  st.textContent=`
#v351AccountMenuBtn,#v351AccountMenu{display:none}
@media(max-width:760px){
  html{width:100%!important;max-width:100%!important;overflow-x:hidden!important}
  .v356ToolbarLane{display:none}
  body.v356-mobile-ui{
    --v356-gap:6px;--v356-pad:8px;--v356-control:38px;
    width:100%!important;max-width:100%!important;overflow-x:hidden!important;
    -webkit-text-size-adjust:100%;text-size-adjust:100%;
  }
  body.v38-clean-workflow .toolbar.compact-main-toolbar{
    display:grid!important;grid-template-columns:minmax(0,1fr)!important;
    grid-template-rows:29px 29px!important;align-items:center!important;
    justify-content:stretch!important;gap:3px!important;min-height:69px!important;
    max-height:calc(69px + env(safe-area-inset-bottom))!important;
    padding:4px max(5px,env(safe-area-inset-right)) calc(4px + env(safe-area-inset-bottom)) max(5px,env(safe-area-inset-left))!important;
    border-radius:10px 10px 0 0!important;overflow:hidden!important;
  }
  body.v38-clean-workflow .toolbar.compact-main-toolbar::-webkit-scrollbar{display:none!important}
  body.v38-clean-workflow .toolbar.compact-main-toolbar>.badge,
  body.v38-clean-workflow .toolbar.compact-main-toolbar>.toolbar-row.main-actions{display:none!important}
  body.v38-clean-workflow .v356ToolbarLane{
    display:flex!important;align-items:center!important;flex-wrap:nowrap!important;gap:4px!important;
    width:100%!important;min-width:0!important;height:29px!important;min-height:29px!important;
    padding:0!important;margin:0!important;overflow-x:auto!important;overflow-y:hidden!important;
    scroll-snap-type:x proximity;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important;
    overscroll-behavior-x:contain!important;
  }
  body.v38-clean-workflow .v356ToolbarLane::-webkit-scrollbar{display:none!important}
  body.v38-clean-workflow #v356ToolbarTop{grid-row:1!important;border-bottom:1px solid rgba(255,255,255,.14)!important}
  body.v38-clean-workflow #v356ToolbarBottom{grid-row:2!important}
  body.v38-clean-workflow #roleAccountCluster{
    position:sticky!important;left:0!important;right:auto!important;top:auto!important;bottom:auto!important;
    order:0!important;display:flex!important;flex:0 0 auto!important;align-items:center!important;
    height:29px!important;min-height:29px!important;gap:3px!important;margin:0!important;padding:0 3px 0 0!important;
    border-radius:7px!important;background:#0867aa!important;z-index:5!important;box-shadow:5px 0 7px rgba(7,94,159,.20)!important;
    scroll-snap-align:start;
  }
  body.v38-clean-workflow #roleStatusBadge{
    display:flex!important;max-width:112px!important;height:27px!important;min-height:27px!important;
    padding:0 6px!important;border-radius:7px!important;font:900 9px/1 Arial,sans-serif!important;
    overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;
  }
  body.v38-clean-workflow #roleChangePasswordBtn,
  body.v38-clean-workflow #roleLogoutBtn{display:none!important}
  body.v38-clean-workflow #v351AccountMenuBtn{
    display:inline-flex!important;align-items:center!important;justify-content:center!important;
    width:27px!important;min-width:27px!important;height:27px!important;min-height:27px!important;
    padding:0!important;margin:0!important;border:1px solid rgba(255,255,255,.25)!important;
    border-radius:7px!important;background:#174f78!important;color:#fff!important;
    font:900 17px/1 Arial,sans-serif!important;box-shadow:none!important;
  }

  body.v38-clean-workflow #v324FormActions{order:10!important;flex:0 0 auto!important;width:auto!important;min-width:0!important}
  body.v38-clean-workflow #v324FormActions.show{display:flex!important;grid-template-columns:none!important;gap:4px!important}
  body.v38-clean-workflow #v313QuickContext{order:20!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;padding:0!important;margin:0!important}
  body.v38-clean-workflow #v320NaContext{order:21!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;padding:0!important;margin:0!important}
  body.v38-clean-workflow #v313QuickContext.show,
  body.v38-clean-workflow #v320NaContext.show{display:flex!important;grid-template-columns:none!important}
  body.v38-clean-workflow #v313QuickContextHint,
  body.v38-clean-workflow #v320NaHint{display:none!important}
  body.v38-clean-workflow #v38CleanNav{
    order:30!important;display:flex!important;flex:0 0 auto!important;flex-wrap:nowrap!important;
    width:auto!important;min-width:0!important;gap:4px!important;padding:0!important;margin:0!important;
    overflow:visible!important;scrollbar-width:none!important;align-items:center!important;
  }
  body.v38-clean-workflow #v38CleanNav::-webkit-scrollbar{display:none!important}

  body.v38-clean-workflow #v324FormActions button,
  body.v38-clean-workflow #v313QuickContextBtn,
  body.v38-clean-workflow #v320NaBtn,
  body.v38-clean-workflow #v38CleanNav .v38NavBtn{
    display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto!important;
    width:auto!important;min-width:0!important;height:29px!important;min-height:29px!important;
    max-height:29px!important;padding:0 8px!important;margin:0!important;border-radius:7px!important;
    font:900 9.5px/1 Arial,sans-serif!important;white-space:nowrap!important;box-shadow:none!important;
    scroll-snap-align:start;touch-action:manipulation!important;
  }
  body.v38-clean-workflow #v324HandoverBtn{max-width:105px!important;overflow:hidden!important;text-overflow:ellipsis!important}
  body.v38-clean-workflow #v342Badge{
    min-width:16px!important;height:16px!important;padding:0 4px!important;margin-left:3px!important;
    border-radius:999px!important;font:900 9px/16px Arial,sans-serif!important;
  }
  body.v38-clean-workflow{padding-bottom:calc(79px + env(safe-area-inset-bottom))!important}

  #v351AccountMenu{
    position:fixed;left:max(6px,env(safe-area-inset-left));bottom:calc(75px + env(safe-area-inset-bottom));
    right:auto;top:auto;
    z-index:80000;width:min(210px,72vw);padding:6px;border:1px solid #cbd9e4;border-radius:11px;
    background:#fff;box-shadow:0 8px 26px rgba(0,31,55,.30);box-sizing:border-box;
  }
  #v351AccountMenu.show{display:grid;gap:5px}
  #v351AccountMenu button{width:100%;min-height:36px;border:0;border-radius:8px;padding:7px 10px;font:900 11px Arial,sans-serif;text-align:left}
  #v351AccountChange{background:#e9f4ff;color:#07599d}
  #v351AccountLogout{background:#fff0ee;color:#a61f17}

  /* Fallback for accounts/screens which have not entered the clean workflow yet. */
  body.v356-mobile-ui:not(.v38-clean-workflow) .toolbar.compact-main-toolbar{
    display:flex!important;align-items:center!important;gap:4px!important;
    padding:4px max(5px,env(safe-area-inset-right)) calc(4px + env(safe-area-inset-bottom)) max(5px,env(safe-area-inset-left))!important;
    overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important;
  }
  body.v356-mobile-ui:not(.v38-clean-workflow) .toolbar.compact-main-toolbar::-webkit-scrollbar{display:none!important}
  body.v356-mobile-ui:not(.v38-clean-workflow) .toolbar-row.main-actions{
    display:flex!important;flex:0 0 auto!important;flex-wrap:nowrap!important;gap:4px!important;
    width:auto!important;overflow:visible!important;padding:0!important;
  }
  body.v356-mobile-ui:not(.v38-clean-workflow) .toolbar-row.main-actions>button{
    flex:0 0 auto!important;width:auto!important;min-width:0!important;min-height:30px!important;
    height:30px!important;padding:0 8px!important;border-radius:7px!important;font-size:9.5px!important;
    line-height:1!important;white-space:nowrap!important;
  }

  /* Shared phone modal shell: more content on screen, still safe for notches and browser bars. */
  body.v356-mobile-ui #entry,
  body.v356-mobile-ui #signModal,
  body.v356-mobile-ui #templateModal,
  body.v356-mobile-ui #exportModal,
  body.v356-mobile-ui #exportChoiceModal,
  body.v356-mobile-ui #formMenuModal,
  body.v356-mobile-ui #flightSessionModal,
  body.v356-mobile-ui #attachmentSourceModal,
  body.v356-mobile-ui #dedicatedSheetChooserModal,
  body.v356-mobile-ui #finalSheetManagerModal,
  body.v356-mobile-ui #fs09SheetManagerModal,
  body.v356-mobile-ui #kh208ManagerModal,
  body.v356-mobile-ui #appUpdateModal,
  body.v356-mobile-ui #updateInfoModal,
  body.v356-mobile-ui #v342Modal,
  body.v356-mobile-ui #v339ApprovalModal,
  body.v356-mobile-ui #v340ManualFlightModal,
  body.v356-mobile-ui #v327ReassignModal,
  body.v356-mobile-ui #sagsV338DossierModal,
  body.v356-mobile-ui .sagsAdminModal{
    padding:max(4px,env(safe-area-inset-top)) max(4px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom)) max(4px,env(safe-area-inset-left))!important;
  }
  body.v356-mobile-ui .panel,
  body.v356-mobile-ui .templateBox,
  body.v356-mobile-ui .exportBox,
  body.v356-mobile-ui .exportChoiceBox,
  body.v356-mobile-ui .formMenuBox,
  body.v356-mobile-ui .attachmentSourceBox,
  body.v356-mobile-ui .flightSessionBox,
  body.v356-mobile-ui .v342Panel,
  body.v356-mobile-ui .v339Box,
  body.v356-mobile-ui .v340Panel,
  body.v356-mobile-ui .v327Panel,
  body.v356-mobile-ui .v338Panel,
  body.v356-mobile-ui .sagsAdminPanel,
  body.v356-mobile-ui .finalPaperCard,
  body.v356-mobile-ui .flightTypeEditBox,
  body.v356-mobile-ui #dedicatedSheetChooserModal>div,
  body.v356-mobile-ui #finalSheetManagerModal>div,
  body.v356-mobile-ui #fs09SheetManagerModal>div,
  body.v356-mobile-ui #kh208ManagerModal>div,
  body.v356-mobile-ui #appUpdateModal>div,
  body.v356-mobile-ui #updateInfoModal>div{
    width:calc(100dvw - env(safe-area-inset-left) - env(safe-area-inset-right) - 8px)!important;
    max-width:100%!important;
    max-height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 8px)!important;
    border-radius:10px!important;padding:10px!important;box-sizing:border-box!important;
    overscroll-behavior:contain!important;
  }
  body.v356-mobile-ui .panel h3,
  body.v356-mobile-ui .formMenuBox h3,
  body.v356-mobile-ui .exportChoiceBox h3,
  body.v356-mobile-ui .attachmentSourceBox h3,
  body.v356-mobile-ui .flightSessionBox h3,
  body.v356-mobile-ui .sagsAdminPanel h3{font-size:16px!important;margin-bottom:7px!important}
  body.v356-mobile-ui .panel textarea{min-height:72px!important;padding:8px!important;font-size:16px!important}
  body.v356-mobile-ui .actions{gap:5px!important;margin-top:7px!important}
  body.v356-mobile-ui .actions button{min-height:38px!important;padding:7px 6px!important;font-size:12px!important}
  body.v356-mobile-ui #sigCanvas{height:min(34dvh,210px)!important}

  /* Form picker and export picker. */
  body.v356-mobile-ui #formMenuModal .formMenuGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
  body.v356-mobile-ui #formMenuModal .formMenuGrid button{
    min-height:44px!important;padding:5px 4px!important;border-radius:8px!important;font-size:12px!important;line-height:1.08!important;
  }
  body.v356-mobile-ui #formMenuModal .formMenuGrid strong{display:block;font-size:13px!important}
  body.v356-mobile-ui #formMenuModal .formMenuGrid span{display:block;margin-top:2px;font-size:9.5px!important;line-height:1.05!important}
  body.v356-mobile-ui .formMenuClose,
  body.v356-mobile-ui .exportChoiceClose{min-height:38px!important;margin-top:6px!important;font-size:12px!important}
  body.v356-mobile-ui .exportFlightSummary{margin-bottom:6px!important;padding:7px 8px!important;font-size:11px!important}
  body.v356-mobile-ui .exportFlightSummary strong{font-size:15px!important}
  body.v356-mobile-ui .exportChoiceGrid{gap:6px!important}
  body.v356-mobile-ui .exportChoiceGrid button{min-height:48px!important;padding:7px 9px!important;border-radius:8px!important}
  body.v356-mobile-ui .exportChoiceGrid strong{font-size:13px!important}
  body.v356-mobile-ui .exportChoiceGrid span{font-size:10.5px!important}
  body.v356-mobile-ui .exportActions{gap:6px!important}
  body.v356-mobile-ui .exportActions button,
  body.v356-mobile-ui .templateActions button,
  body.v356-mobile-ui .attachmentSourceBox button{min-height:40px!important;font-size:12px!important;margin-top:5px!important}

  /* MY FLIGHT / Flight Workspace: compact cards and keep the primary actions visible. */
  body.v356-mobile-ui #fwcModal{
    padding:max(3px,env(safe-area-inset-top)) max(3px,env(safe-area-inset-right)) max(3px,env(safe-area-inset-bottom)) max(3px,env(safe-area-inset-left))!important;
  }
  body.v356-mobile-ui #fwcModal .fwcPanel{
    width:100%!important;max-width:100%!important;
    max-height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 6px)!important;
    padding:6px!important;border-radius:9px!important;
  }
  body.v356-mobile-ui #fwcModal .fwcHead{gap:5px!important;padding:2px 1px 5px!important}
  body.v356-mobile-ui #fwcModal .fwcHead h3{font-size:15px!important;line-height:1.15!important}
  body.v356-mobile-ui #fwcModal .fwcSub{font-size:9.5px!important;line-height:1.25!important;margin-top:2px!important}
  body.v356-mobile-ui #fwcModal .fwcHead>.fwcBtn{min-height:34px!important;padding:6px 9px!important;font-size:10px!important}
  body.v356-mobile-ui #fwcStickyNav{
    flex-wrap:nowrap!important;overflow-x:auto!important;gap:4px!important;padding:5px 0!important;scrollbar-width:none!important;
  }
  body.v356-mobile-ui #fwcStickyNav::-webkit-scrollbar{display:none!important}
  body.v356-mobile-ui #fwcStickyNav .fwcBtn{flex:0 0 auto!important;min-height:34px!important;padding:6px 8px!important;font-size:10px!important}
  body.v356-mobile-ui #fwcBody{padding-top:2px!important}
  body.v356-mobile-ui #fwcBody .fwcTools{display:grid!important;grid-template-columns:1fr 1fr!important;gap:5px!important;margin:5px 0!important}
  body.v356-mobile-ui #fwcBody .fwcTools>*{width:100%!important;min-width:0!important;min-height:36px!important;margin:0!important;padding:6px!important;font-size:10.5px!important}
  body.v356-mobile-ui #fwcBody .fwcStatus{padding:6px 7px!important;margin:5px 0!important;font-size:10px!important}
  body.v356-mobile-ui #fwcBody .v38ListHint{padding:3px 1px!important;font-size:10px!important}
  body.v356-mobile-ui #fwcBody .v38MyToggle{min-height:36px!important;padding:5px 7px!important;gap:5px!important;font-size:10.5px!important}
  body.v356-mobile-ui #fwcBody .v38MyToggle input{width:16px!important;height:16px!important}
  body.v356-mobile-ui #fwcBody .fwcFlight{
    margin:5px 0!important;padding:7px!important;gap:5px!important;border-radius:9px!important;grid-template-columns:minmax(0,1fr)!important;
  }
  body.v356-mobile-ui #fwcBody .fwcFlightTitle{font-size:15px!important;line-height:1.15!important}
  body.v356-mobile-ui #fwcBody .fwcMeta{font-size:10.5px!important;line-height:1.3!important;margin-top:2px!important}
  body.v356-mobile-ui #fwcBody .fwcBadges,
  body.v356-mobile-ui #fwcBody .v38Flags{gap:3px!important}
  body.v356-mobile-ui #fwcBody .fwcBadge,
  body.v356-mobile-ui #fwcBody .v38Flag,
  body.v356-mobile-ui #fwcBody .v324ClaimBadge{padding:2px 5px!important;margin:0 3px 2px 0!important;font-size:8.5px!important}
  body.v356-mobile-ui #fwcBody .v350CardActions{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:5px!important}
  body.v356-mobile-ui #fwcBody .fwcFlight .fwcBtn{width:100%!important;min-height:36px!important;padding:6px!important;font-size:10.5px!important}
  body.v356-mobile-ui #fwcBody .fwcWorkspaceHead{padding:8px!important;margin-bottom:6px!important;border-radius:9px!important}
  body.v356-mobile-ui #fwcBody .fwcWorkspaceTitle{font-size:17px!important}
  body.v356-mobile-ui #fwcBody .fwcUnitGrid{gap:6px!important}
  body.v356-mobile-ui #fwcBody .fwcUnit{padding:7px!important;border-radius:9px!important}
  body.v356-mobile-ui #fwcBody .fwcUnit h4{margin-bottom:3px!important;font-size:13px!important}
  body.v356-mobile-ui #fwcBody .fwcOwner,
  body.v356-mobile-ui #fwcBody .fwcTasks{font-size:10px!important;line-height:1.3!important;margin-top:3px!important}
  body.v356-mobile-ui #fwcBody .v38ViewOnly,
  body.v356-mobile-ui #fwcBody .v38MyOps{margin-bottom:6px!important;padding:7px!important;border-radius:9px!important}
  body.v356-mobile-ui #fwcBody .v38MyOpsTitle{font-size:13px!important;margin-bottom:2px!important}
  body.v356-mobile-ui #fwcBody .v38MyOpsSub{font-size:9.5px!important;margin-bottom:5px!important}
  body.v356-mobile-ui #fwcBody .v38MyOpsBtns{display:flex!important;gap:5px!important;flex-wrap:wrap!important}
  body.v356-mobile-ui #fwcBody .v38OpBtn{flex:1 1 calc(50% - 3px)!important;min-height:36px!important;padding:6px!important;font-size:10px!important}

  /* Legacy/local flight chooser. */
  body.v356-mobile-ui .flightSessionBox{max-height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 8px)!important}
  body.v356-mobile-ui .flightSessionCurrent{font-size:10.5px!important;margin-bottom:6px!important}
  body.v356-mobile-ui .flightSessionCreate{gap:5px!important;margin-bottom:7px!important}
  body.v356-mobile-ui .flightSessionCreate input,
  body.v356-mobile-ui .flightSessionCreate select{min-height:38px!important;padding:6px!important;font-size:16px!important}
  body.v356-mobile-ui .flightSessionCreate button,
  body.v356-mobile-ui .flightSessionClose{min-height:38px!important;padding:6px 9px!important;font-size:11px!important}
  body.v356-mobile-ui .flightSessionList{gap:5px!important}
  body.v356-mobile-ui .flightSessionRow{padding:6px!important;gap:5px!important;border-radius:8px!important}
  body.v356-mobile-ui .flightSessionSelect{padding:2px!important}
  body.v356-mobile-ui .flightSessionSelect strong{font-size:14px!important}
  body.v356-mobile-ui .flightSessionSelect span{font-size:10px!important;margin-top:2px!important}
  body.v356-mobile-ui .flightSessionActions{gap:4px!important}
  body.v356-mobile-ui .flightSessionEdit,
  body.v356-mobile-ui .flightSessionDelete{min-width:52px!important;min-height:34px!important;padding:5px 7px!important;font-size:10px!important}

  /* FINAL/PVHK managers and FINAL document header. */
  body.v356-mobile-ui #finalSheetManagerModal>div,
  body.v356-mobile-ui #fs09SheetManagerModal>div,
  body.v356-mobile-ui #kh208ManagerModal>div{overflow:auto!important}
  body.v356-mobile-ui #finalSheetManagerModal h3,
  body.v356-mobile-ui #fs09SheetManagerModal h3,
  body.v356-mobile-ui #kh208ManagerModal h3,
  body.v356-mobile-ui #dedicatedSheetChooserModal h3{font-size:15px!important;line-height:1.15!important}
  body.v356-mobile-ui #finalSheetManagerModal [style*="padding:10px"],
  body.v356-mobile-ui #fs09SheetManagerModal [style*="padding:10px"],
  body.v356-mobile-ui #kh208ManagerModal [style*="padding:10px"]{padding:7px!important;margin-bottom:7px!important}
  body.v356-mobile-ui #finalSheetManagerModal input,
  body.v356-mobile-ui #finalSheetManagerModal select,
  body.v356-mobile-ui #fs09SheetManagerModal input,
  body.v356-mobile-ui #kh208ManagerModal input,
  body.v356-mobile-ui #kh208ManagerModal select{height:38px!important;min-height:38px!important;font-size:16px!important}
  body.v356-mobile-ui #finalSheetManagerModal button,
  body.v356-mobile-ui #fs09SheetManagerModal button,
  body.v356-mobile-ui #kh208ManagerModal button,
  body.v356-mobile-ui #dedicatedSheetChooserModal button{min-height:36px!important;font-size:10.5px!important}
  body.v356-mobile-ui .finalSheetItem{gap:5px!important;padding:7px!important;border-radius:8px!important;font-size:11px!important}
  body.v356-mobile-ui .finalSheetItem button{min-height:34px!important;padding:5px 7px!important;font-size:10px!important}
  body.v356-mobile-ui #finalFormsModal{padding:0!important;overflow-x:hidden!important}
  body.v356-mobile-ui #finalFormsModal .finalFormsPanel{width:100%!important;max-width:100%!important;min-height:100dvh!important;border-radius:0!important}
  body.v356-mobile-ui #finalFormsModal .finalFormsHeader{min-height:38px!important;padding:max(4px,env(safe-area-inset-top)) 4px 4px!important;gap:3px!important}
  body.v356-mobile-ui #finalFormsModal .finalFormsHeader>span{font-size:10.5px!important}
  body.v356-mobile-ui #finalFormsModal .finalHeaderActions{gap:2px!important;min-width:0!important}
  body.v356-mobile-ui #finalFormsModal .finalHeaderBtn,
  body.v356-mobile-ui #finalFormsModal .v338FinalDossierBtn{
    min-width:0!important;width:auto!important;height:32px!important;min-height:32px!important;
    padding:0 5px!important;border-radius:6px!important;font-size:8.5px!important;white-space:nowrap!important;
  }
  body.v356-mobile-ui #finalFormsModal .finalFormsClose{width:32px!important;min-width:32px!important;height:32px!important;font-size:18px!important}
  body.v356-mobile-ui #finalFormsModal .finalFormsChoices{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px!important;padding:5px!important}
  body.v356-mobile-ui #finalFormsModal .finalFormsChoices button{min-height:36px!important;padding:4px 2px!important;font-size:9px!important}
  body.v356-mobile-ui #finalFormsModal .finalFormStage{padding:2px!important}

  /* Action center, approvals and shared dossier. */
  body.v356-mobile-ui .v342Head{padding:9px!important;border-radius:10px 10px 0 0!important}
  body.v356-mobile-ui .v342Title{font-size:16px!important}
  body.v356-mobile-ui .v342Sub{font-size:9.5px!important;margin-top:2px!important}
  body.v356-mobile-ui .v342Close,
  body.v356-mobile-ui .v339Close,
  body.v356-mobile-ui .v338Close{min-height:34px!important;padding:6px 8px!important;font-size:10px!important}
  body.v356-mobile-ui .v342Sync{margin:6px 7px 0!important;padding:6px 7px!important;font-size:10px!important}
  body.v356-mobile-ui .v342Sync button{min-height:32px!important;padding:5px 7px!important;font-size:9px!important}
  body.v356-mobile-ui .v342Summary{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px!important;margin:6px 7px!important}
  body.v356-mobile-ui .v342Metric{padding:5px 2px!important;border-radius:7px!important}
  body.v356-mobile-ui .v342Metric b{font-size:16px!important}
  body.v356-mobile-ui .v342Metric span{font-size:7.5px!important;line-height:1.05!important}
  body.v356-mobile-ui .v342Tabs{gap:4px!important;padding:0 7px 6px!important}
  body.v356-mobile-ui .v342Tab{padding:6px 8px!important;font-size:9.5px!important}
  body.v356-mobile-ui .v342Status{margin:0 7px 5px!important;font-size:9.5px!important}
  body.v356-mobile-ui .v342List{gap:5px!important;padding:0 7px 8px!important}
  body.v356-mobile-ui .v342Card{padding:7px!important;border-radius:9px!important}
  body.v356-mobile-ui .v342CardTitle{font-size:13px!important}
  body.v356-mobile-ui .v342Flight{font-size:11.5px!important;margin-top:2px!important}
  body.v356-mobile-ui .v342Meta,
  body.v356-mobile-ui .v342Reason{font-size:9.5px!important;margin-top:4px!important;padding:5px!important}
  body.v356-mobile-ui .v342Actions{gap:4px!important;margin-top:6px!important}
  body.v356-mobile-ui .v342Actions .v342Btn{flex:1 1 calc(50% - 2px)!important;min-height:36px!important;padding:5px!important;font-size:9.5px!important}
  body.v356-mobile-ui .v342Help{margin:0 7px 8px!important;padding:6px!important;font-size:9.5px!important}
  body.v356-mobile-ui .v339Box,
  body.v356-mobile-ui .v338Panel{overflow:auto!important}
  body.v356-mobile-ui .v339Head h3,
  body.v356-mobile-ui .v338Head h3{font-size:16px!important}
  body.v356-mobile-ui .v339Sub,
  body.v356-mobile-ui .v339Meta,
  body.v356-mobile-ui .v338Meta{font-size:10px!important;line-height:1.3!important}
  body.v356-mobile-ui .v339List,
  body.v356-mobile-ui .v338Docs{gap:5px!important}
  body.v356-mobile-ui .v339Card,
  body.v356-mobile-ui .v338Doc{padding:7px!important;border-radius:8px!important}
  body.v356-mobile-ui .v339Actions{gap:4px!important;margin-top:6px!important}
  body.v356-mobile-ui .v339Btn,
  body.v356-mobile-ui .v338Btn{min-height:34px!important;padding:5px 7px!important;font-size:9.5px!important}

  /* Manual flight, reassignment and admin tools. */
  body.v356-mobile-ui .v340Panel{overflow:auto!important}
  body.v356-mobile-ui .v340Head h3,
  body.v356-mobile-ui .v327Head h3{font-size:15px!important}
  body.v356-mobile-ui .v340Sub,
  body.v356-mobile-ui .v327Sub{font-size:9.5px!important;line-height:1.3!important}
  body.v356-mobile-ui .v340Grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;margin-top:7px!important}
  body.v356-mobile-ui .v340Field.wide{grid-column:1/-1!important}
  body.v356-mobile-ui .v340Field label{font-size:9px!important}
  body.v356-mobile-ui .v340Field input,
  body.v356-mobile-ui .v340Field select{min-height:38px!important;padding:6px!important;font-size:16px!important}
  body.v356-mobile-ui .v340Note{margin-top:7px!important;padding:6px!important;font-size:9.5px!important}
  body.v356-mobile-ui .v340Actions{gap:5px!important;margin-top:7px!important}
  body.v356-mobile-ui .v340Btn{min-height:38px!important;padding:6px 8px!important;font-size:10px!important}
  body.v356-mobile-ui .v327Tools{grid-template-columns:105px minmax(0,1fr) auto!important;gap:4px!important;margin:6px 0!important}
  body.v356-mobile-ui .v327Tools input,
  body.v356-mobile-ui .v327Tools select{min-height:36px!important;padding:5px!important;font-size:10px!important}
  body.v356-mobile-ui .v327Card{padding:6px!important}
  body.v356-mobile-ui .v327Assign{grid-template-columns:minmax(0,1fr) minmax(105px,.8fr) auto!important;gap:4px!important}
  body.v356-mobile-ui .v327Btn{min-height:34px!important;padding:5px 7px!important;font-size:9.5px!important}
  body.v356-mobile-ui .sagsAdminPanel{font-size:12px!important;overflow:auto!important}
  body.v356-mobile-ui .sagsAdminPanel .sub{margin-bottom:7px!important;font-size:10px!important}
  body.v356-mobile-ui .sagsAdminGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:5px!important}
  body.v356-mobile-ui .sagsAdminField input,
  body.v356-mobile-ui .sagsAdminField select{height:38px!important;font-size:16px!important}
  body.v356-mobile-ui .sagsAdminTopActions{gap:5px!important;margin-bottom:6px!important}
  body.v356-mobile-ui .sagsAdminBtn{height:36px!important;min-height:36px!important;padding:0 8px!important;font-size:10px!important}

  /* Login and quick-entry screens. */
  body.v356-mobile-ui #roleLoginModal{padding:max(6px,env(safe-area-inset-top)) 6px max(6px,env(safe-area-inset-bottom))!important}
  body.v356-mobile-ui .roleLoginCard{width:min(94dvw,370px)!important;max-height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 12px)!important;overflow:auto!important;padding:14px!important;border-radius:12px!important}
  body.v356-mobile-ui .roleLoginLogo{margin-bottom:5px!important}
  body.v356-mobile-ui .roleLoginLogo img{max-height:min(25dvh,150px)!important}
  body.v356-mobile-ui .roleLoginCard h2{font-size:18px!important;margin:5px 0 2px!important}
  body.v356-mobile-ui .roleLoginCard p{font-size:11px!important;margin-bottom:8px!important}
  body.v356-mobile-ui .roleLoginCard label{font-size:11px!important;margin:6px 0 3px!important}
  body.v356-mobile-ui .roleLoginCard select,
  body.v356-mobile-ui .roleLoginCard input{height:40px!important;font-size:16px!important}
  body.v356-mobile-ui #roleLoginSubmit{height:40px!important;margin-top:9px!important}
  body.v356-mobile-ui #fs09QuickModal .fs09qPanel{width:100dvw!important;max-width:100dvw!important;height:100dvh!important;max-height:100dvh!important;border-radius:0!important}
  body.v356-mobile-ui #fs09QuickModal .fs09qHead{padding:6px 7px!important}
  body.v356-mobile-ui #fs09QuickModal .fs09qTabs{gap:3px!important;margin-top:5px!important}
  body.v356-mobile-ui #fs09QuickModal .fs09qTab{min-height:30px!important;font-size:9.5px!important}
  body.v356-mobile-ui #fs09QuickModal .fs09qBody{padding:0 5px 7px!important}
  body.v356-mobile-ui #fs09QuickModal .fs09qRow{min-height:54px!important;padding:4px!important;gap:3px!important}
  body.v356-mobile-ui #fs09QuickModal .fs09qLabel{font-size:10px!important}
  body.v356-mobile-ui #fs09QuickModal .fs09qFooter{padding:6px 7px calc(6px + env(safe-area-inset-bottom))!important}
  body.v356-mobile-ui #fs09QuickModal .fs09qSave{min-height:42px!important;font-size:13px!important}
}
@media(max-width:390px){
  body.v356-mobile-ui{--v356-gap:4px;--v356-pad:6px}
  body.v38-clean-workflow #roleStatusBadge{max-width:94px!important;padding:0 5px!important;font-size:8.5px!important}
  body.v38-clean-workflow #v324FormActions button,
  body.v38-clean-workflow #v313QuickContextBtn,
  body.v38-clean-workflow #v320NaBtn,
  body.v38-clean-workflow #v38CleanNav .v38NavBtn{height:28px!important;min-height:28px!important;padding:0 6px!important;font-size:9px!important}
  body.v356-mobile-ui #fwcBody .fwcTools{grid-template-columns:1fr!important}
  body.v356-mobile-ui #finalFormsModal .finalFormsHeader>span{max-width:62px!important;font-size:9px!important}
  body.v356-mobile-ui #finalFormsModal .finalHeaderBtn,
  body.v356-mobile-ui #finalFormsModal .v338FinalDossierBtn{padding:0 4px!important;font-size:8px!important}
  body.v356-mobile-ui #fs09QuickModal .fs09qRow{grid-template-columns:minmax(82px,1fr) 92px 92px!important}
  body.v356-mobile-ui #fs09QuickModal .fs09qRow.single .fs09qSingle{width:128px!important}
  body.v356-mobile-ui .v327Tools{grid-template-columns:1fr 1fr!important}
  body.v356-mobile-ui .v327Tools .v327Reload{grid-column:1/-1!important}
  body.v356-mobile-ui .v327Assign{grid-template-columns:1fr!important}
  body.v356-mobile-ui .v340Grid{grid-template-columns:1fr!important}
  body.v356-mobile-ui .v340Field.wide{grid-column:1!important}
}
@media(max-width:760px) and (max-height:600px){
  body.v356-mobile-ui .roleLoginLogo img{max-height:92px!important}
  body.v356-mobile-ui .roleLoginCard{padding:10px!important}
  body.v356-mobile-ui .v342Sub,
  body.v356-mobile-ui .fwcSub{display:none!important}
}
@media print{#v351AccountMenuBtn,#v351AccountMenu{display:none!important}}
`;
  document.head.appendChild(st);
}

function closeMenu(){const m=document.getElementById("v351AccountMenu"),b=document.getElementById("v351AccountMenuBtn");m?.classList.remove("show");b?.setAttribute("aria-expanded","false")}
function toggleMenu(){const m=document.getElementById("v351AccountMenu");if(!m)return;const open=!m.classList.contains("show");m.classList.toggle("show",open);document.getElementById("v351AccountMenuBtn")?.setAttribute("aria-expanded",open?"true":"false")}

function ensureAccountMenu(){
  const cluster=document.getElementById("roleAccountCluster");if(!cluster)return;
  let b=document.getElementById("v351AccountMenuBtn");
  if(!b){b=document.createElement("button");b.id="v351AccountMenuBtn";b.type="button";b.textContent="⋮";b.title="Tài khoản";b.setAttribute("aria-label","Mở công cụ tài khoản");b.setAttribute("aria-expanded","false");b.onclick=e=>{e.stopPropagation();toggleMenu()};cluster.appendChild(b)}
  if(!document.getElementById("v351AccountMenu")){
    const m=document.createElement("div");m.id="v351AccountMenu";m.setAttribute("role","menu");m.innerHTML='<button id="v351AccountChange" type="button" role="menuitem">🔑 ĐỔI MẬT KHẨU</button><button id="v351AccountLogout" type="button" role="menuitem">↪ ĐĂNG XUẤT</button>';document.body.appendChild(m);
    document.getElementById("v351AccountChange").onclick=()=>{closeMenu();document.getElementById("roleChangePasswordBtn")?.click()};
    document.getElementById("v351AccountLogout").onclick=()=>{closeMenu();document.getElementById("roleLogoutBtn")?.click()};
  }
}

let arrangeQueued=false;
function arrangeToolbar(){
  arrangeQueued=false;
  const bar=document.querySelector(".toolbar.compact-main-toolbar");if(!bar)return;
  if(root.matchMedia&&!root.matchMedia("(max-width:760px)").matches){
    const top=document.getElementById("v356ToolbarTop"),bottom=document.getElementById("v356ToolbarBottom");
    if(top||bottom){
      const main=[...bar.children].find(el=>el.classList?.contains("main-actions"))||null;
      const account=document.getElementById("roleAccountCluster");if(account&&(account.parentElement===top||account.parentElement===bottom))bar.insertBefore(account,main);
      for(const id of ["v324FormActions","v313QuickContext","v320NaContext","v38CleanNav"]){const el=document.getElementById(id);if(el&&(el.parentElement===top||el.parentElement===bottom))bar.appendChild(el)}
      top?.remove();bottom?.remove();
    }
    return;
  }
  let top=document.getElementById("v356ToolbarTop"),bottom=document.getElementById("v356ToolbarBottom");
  if(!top){top=document.createElement("div");top.id="v356ToolbarTop";top.className="v356ToolbarLane";bar.appendChild(top)}
  if(!bottom){bottom=document.createElement("div");bottom.id="v356ToolbarBottom";bottom.className="v356ToolbarLane";bar.appendChild(bottom)}
  for(const id of ["roleAccountCluster","v324FormActions","v313QuickContext","v320NaContext"]){const el=document.getElementById(id);if(el&&el.parentElement!==top)top.appendChild(el)}
  const nav=document.getElementById("v38CleanNav");if(nav&&nav.parentElement!==bottom)bottom.appendChild(nav);
}
function queueArrange(){if(arrangeQueued)return;arrangeQueued=true;setTimeout(arrangeToolbar,0)}
function install(){ensureStyle();ensureAccountMenu();document.body.classList.add("v351-compact-toolbar","v356-mobile-ui","v357-two-row-toolbar");arrangeToolbar();setTimeout(()=>root.v313QuickTimeRefresh?.(),0)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(install,250),{once:true});else setTimeout(install,250);
root.addEventListener("pageshow",()=>setTimeout(install,120),{passive:true});
root.matchMedia?.("(max-width:760px)")?.addEventListener?.("change",queueArrange);
document.addEventListener("click",e=>{if(!e.target.closest?.("#v351AccountMenu,#v351AccountMenuBtn"))closeMenu()},{passive:true});
new MutationObserver(queueArrange).observe(document.documentElement,{childList:true,subtree:true});
root.__SAGS_V351_COMPACT_TOOLBAR_BUILD=BUILD;
root.__SAGS_V356_MOBILE_UI_BUILD=BUILD;
root.__SAGS_V357_MOBILE_UI_BUILD=BUILD;
root.__SAGS_V351_COMPACT_TOOLBAR_HDSD="V3.57: Thanh công cụ điện thoại chia thành 2 hàng. Hàng trên chứa tài khoản và thao tác của biểu mẫu đang làm; hàng dưới chứa các chức năng điều hướng. Mỗi hàng chỉ cuộn ngang khi thật sự thiếu chỗ, giảm quãng vuốt so với một hàng dài. Các tối ưu mobile-first V3.56 được giữ nguyên; không đổi quyền, handler hay dữ liệu Firebase.";
root.__SAGS_V356_MOBILE_UI_HDSD=root.__SAGS_V351_COMPACT_TOOLBAR_HDSD;
root.__SAGS_V357_MOBILE_UI_HDSD=root.__SAGS_V351_COMPACT_TOOLBAR_HDSD;
})(typeof window!=="undefined"?window:globalThis);
