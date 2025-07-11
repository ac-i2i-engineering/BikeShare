function printFormFieldInfo(formId){
  const form = FormApp.openById(formId);
  form.getItems().forEach(item=>{
    console.log(`ID: ${item.getId()}, Title: ${item.getTitle()}, Type: ${item.getType()}`);
  });
}

function simulateHandleOnFormSubmit(sheetName, responses) {
  const service = new BikeShareService();
  const sheet = service.db.getSheet(sheetName);
  service.db.sortByColumn(sheet, null);
  const range = sheet.getRange(2, 1, 1, responses.length);
  // Check if the edit is in the 'Checkout Logs' or 'Return Logs' sheet
  if (sheetName === CONFIG.SHEETS.CHECKOUT_LOGS.NAME) {
    const result = service.processCheckout(responses, range);
    Logger.log('Checkout processed:', result.message || result.error);
  } else if (sheetName === CONFIG.SHEETS.RETURN_LOGS.NAME) {
    const result = service.processReturn(responses, range);
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