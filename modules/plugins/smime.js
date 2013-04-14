/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Thunderbird Conversations
 *
 * The Initial Developer of the Original Code is
 *  Jonathan Protzenko <jonathan.protzenko@gmail.com>
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Martin Garbe <mg.inf.unihro@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var EXPORTED_SYMBOLS = [];

const Cu = Components.utils;
const nsICMSMessageErrors = Components.interfaces.nsICMSMessageErrors;

Cu.import("resource://gre/modules/Services.jsm"); // https://developer.mozilla.org/en/JavaScript_code_modules/Services.jsm
Cu.import("resource:///modules/StringBundle.js"); // for StringBundle
Cu.import("resource://conversations/modules/stdlib/msgHdrUtils.js");
Cu.import("resource://conversations/modules/stdlib/misc.js");
Cu.import("resource://conversations/modules/stdlib/compose.js");
Cu.import("resource://conversations/modules/misc.js");
Cu.import("resource://conversations/modules/hook.js");
Cu.import("resource://conversations/modules/log.js");

let strings = new StringBundle("chrome://conversations/locale/message.properties");

// Show security info of message (signed and ecryption status)
//
// The function was taken from
// http://mxr.mozilla.org/comm-central/source/mailnews/extensions/smime/content/msgReadSMIMEOverlay.js
function showMessageReadSecurityInfo(aMsgWindow,aMessage)
{
  let pkiParams = Components.classes["@mozilla.org/security/pkiparamblock;1"].createInstance(Components.interfaces.nsIPKIParamBlock);

  // isupport array starts with index 1
  pkiParams.setISupportAtIndex(1, topMail3Pane(aMessage).gSignerCert);
  pkiParams.setISupportAtIndex(2, topMail3Pane(aMessage).gEncryptionCert);

  var params = pkiParams.QueryInterface(Components.interfaces.nsIDialogParamBlock);
  // int array starts with index 0, but that is used for window exit status
  params.SetInt(1, topMail3Pane(aMessage).gSignatureStatus);
  params.SetInt(2, topMail3Pane(aMessage).gEncryptionStatus);

  let window = getMail3Pane();
  window.openDialog("chrome://messenger-smime/content/msgReadSecurityInfo.xul", "", "chrome,resizable=1,modal=1,dialog=1", pkiParams);
}

// Helper function for addSignedLabel()
function addSignedNode(aSignNodeString, aDomNode,aMsgWindow,aMessage) {
     let signedTag; 
     aDomNode.classList.add(aSignNodeString);
     signedTag = aDomNode.querySelector(".keep-tag.tag-"+aSignNodeString);
     signedTag.addEventListener("click", function (event) {
       // Open security info.
       showMessageReadSecurityInfo(aMsgWindow,aMessage);
     }, false);
     signedTag.style.cursor = "pointer";
}

// Add signed label and click action to a signed message.
//
// Basically this function is similar to the one in enigmail.js
function addSignedLabel(aStatus, aDomNode,aMsgWindow,aMessage) {
  
  switch (aStatus) {
    case nsICMSMessageErrors.SUCCESS: //ok
     //insert "signed" label
     addSignedNode("signed", aDomNode,aMsgWindow,aMessage);
     break;

    case nsICMSMessageErrors.VERIFY_NOT_YET_ATTEMPTED: 
     //signature unknown
     //make special sign here
     addSignedNode("signed-uncertain", aDomNode,aMsgWindow,aMessage);
     aDomNode.classList.remove("signed");
     [x.setAttribute("title", strings.get("unknownGood"))
      for each ([, x] in Iterator(aDomNode.querySelectorAll(".tag-signed-uncertain")))];
     break;

    //case nsICMSMessageErrors.VERIFY_CERT_WITHOUT_ADDRESS:
    //case nsICMSMessageErrors.VERIFY_HEADER_MISMATCH:
    
    default:
      //signature not ok
      //make special sign here
      addSignedNode("signed-invalid", aDomNode,aMsgWindow,aMessage);
      aDomNode.classList.remove("signed");
      [x.setAttribute("title", strings.get("invalidSignature"))
       for each ([, x] in Iterator(aDomNode.querySelectorAll(".tag-signed-invalid")))];
      break;
  }
}

registerHook({
  
  onMessageStreamed: function _cryptHook_onMessageStreamed(aMsgHdr, aDomNode, aMsgWindow, aMessage) {
    
    let iframe = aDomNode.getElementsByTagName("iframe")[0];
    let iframeDoc = iframe.contentDocument;
    if (iframeDoc.body.textContent.length > 0 ) {
      if (topMail3Pane(aMessage).gEncryptionStatus != -1) {
        aDomNode.classList.add("encrypted");
      } 
      let signStatus  = topMail3Pane(aMessage).gSignatureStatus;
      if ( signStatus != -1) {
        addSignedLabel(signStatus,aDomNode,aMsgWindow,aMessage);
      }       
    }
  }
  
});