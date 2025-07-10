function printFormFieldInfo(formId){
  const form = FormApp.openById(formId);
  form.getItems().forEach(item=>{
    console.log(`ID: ${item.getId()}, Title: ${item.getTitle()}, Type: ${item.getType()}`);
  });
}

function simulateHandleOnFormSubmit(sheetName, response) {
  const service = new BikeShareService();
  // Check if the edit is in the 'Checkout Logs' or 'Return Logs' sheet
  if (sheetName === CONFIG.SHEETS.CHECKOUT_LOGS.NAME) {
    const result = service.processCheckout(response);
    Logger.log('Checkout processed:', result.message || result.error);
  } else if (sheetName === CONFIG.SHEETS.RETURN_LOGS.NAME) {
    const result = service.processReturn(response);
    Logger.log('Return processed:', result.message || result.error);
  }
}

function clearCash(){
let cache = PropertiesService.getScriptProperties();
  cache.deleteAllProperties(); // Clears the cached data associated with the key "data"
}

function createOnSubmitTrigger(){
  const sheet = SpreadsheetApp.getActive()
  ScriptApp.newTrigger('handleOnFormSubmit')
    .forSpreadsheet(sheet)
    .onFormSubmit()
    .create();
}

function deleteAllTriggers(){
  triggers = ScriptApp.getProjectTriggers(); 
  for (let i = 0; i < triggers.length; i++) { 
    ScriptApp.deleteTrigger(triggers[i]); 
    }
}