function quickTest(){
  const rep = new Report();
  console.log(rep.getPeriodNumber());
}

function printFormFieldInfo(formId){
  const form = FormApp.openById(formId);
  form.getItems().forEach(item=>{
    console.log(`ID: ${item.getId()}, Title: ${item.getTitle()}, Type: ${item.getType()}`);
  });
}

function clearCache(){
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

function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[str2.length][str1.length];
}

function fuzzyMatch(target, comp){
  if (typeof(target) === 'number' && typeof(comp) === 'number'){
    return target === comp;
  }
  if (!target || !comp) return false;
  if (target.toLowerCase() === comp.toLowerCase()) return true;
  if (target.length < 3 || comp.length < 3) return false;
  const distance = levenshteinDistance(target, comp);
  const maxLen = Math.max(target.length, comp.length);
  return distance / maxLen < CONFIG.FUZZY_MATCHING_THRESHOLD;
}