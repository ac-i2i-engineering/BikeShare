function quickTest(){
  CACHED_SETTINGS.refreshCache()
  console.log(CACHED_SETTINGS.VALUES)
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

function installOnSubmitTrigger(){
  const sheet = SpreadsheetApp.getActive()
  ScriptApp.newTrigger('handleOnFormSubmit')
    .forSpreadsheet(sheet)
    .onFormSubmit()
    .create();
}

// creates a trigger that runs every n days at a specific hour
function installExecuteReportGenerationTrigger(){
  const dayInterval = CACHED_SETTINGS.VALUES.REPORT_GENERATION.DAYS_INTERVAL;
  const hour = CACHED_SETTINGS.VALUES.REPORT_GENERATION.GENERATION_HOUR;
  ScriptApp.newTrigger('executeReportGeneration')
    .timeBased()
    .everyDays(dayInterval)
    .atHour(hour)
    .create();
}

function installScheduleSystemShutdownAndActivationTrigger(){
  const activationDate = CACHED_SETTINGS.VALUES.NEXT_SYSTEM_ACTIVATION_DATE
  const shutdownDate = CACHED_SETTINGS.VALUES.NEXT_SYSTEM_SHUTDOWN_DATE
  const curDate = new Date()
  const sheet = SpreadsheetApp.openById(CACHED_SETTINGS.VALUES.MAIN_DASHBOARD_SS_ID)
  if(activationDate > curDate){
    ScriptApp.newTrigger('activateSystem').forSpreadsheet(sheet).timeBased().at(activationDate).create()
  }
  if(shutdownDate > curDate){
    ScriptApp.newTrigger('shutdownSystem').forSpreadsheet(sheet).timeBased().at(activationDate).create()
  }
}
function installHandleSettingsUpdateTrigger(){
  ScriptApp.newTrigger('handleSettingsUpdate').forSpreadsheet(CACHED_SETTINGS.management_ss).onChange().create();
}

function deleteAllTriggers(){
  triggers = ScriptApp.getProjectTriggers(); 
  for (let i = 0; i < triggers.length; i++) { 
    ScriptApp.deleteTrigger(triggers[i]); 
    }
}

function reInstallAllTriggers(){
  clearCache()
  deleteAllTriggers();
  installOnSubmitTrigger();
  installExecuteReportGenerationTrigger();
  installHandleSettingsUpdateTrigger()
  installScheduleSystemShutdownAndActivationTrigger()
  installUpdateUsageTimersTrigger();
}

function installUpdateUsageTimersTrigger() {
  const intervalMinutes = 5;
  ScriptApp.newTrigger('executeUsageTimerUpdate')
    .timeBased()
    .everyMinutes(intervalMinutes)
    .create();
}

function shutdownSystem(){
  FormApp.openById(CACHED_SETTINGS.VALUES.FORMS.CHECKOUT_FORM_ID).setAcceptingResponses(false)
  FormApp.openById(CACHED_SETTINGS.VALUES.FORMS.RETURN_FORM_ID).setAcceptingResponses(false);
}

function activateSystem(){
  FormApp.openById(CACHED_SETTINGS.VALUES.FORMS.CHECKOUT_FORM_ID).setAcceptingResponses(true)
  FormApp.openById(CACHED_SETTINGS.VALUES.FORMS.RETURN_FORM_ID).setAcceptingResponses(true);
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

function fuzzyMatch(target, comp, isNotFuzzy=false){
  if (target == null || comp == null) return false;
  // Numbers: direct match
  if (typeof target === 'number' && typeof comp === 'number') {
    return target === comp;
  }
  // Strings: normalize and compare
  if (typeof target === 'string') target = target.trim().toLowerCase();
  if (typeof comp === 'string') comp = comp.trim().toLowerCase();
  if (isNotFuzzy) {
    return target === comp;
  }
  if (target === comp) return true;
  if (typeof target === 'string' && typeof comp === 'string') {
    if (target.length < 3 || comp.length < 3) return false;
    const distance = levenshteinDistance(target, comp);
    const maxLen = Math.max(target.length, comp.length);
    return distance / maxLen < CACHED_SETTINGS.VALUES.FUZZY_MATCHING_THRESHOLD;
  }
  return false;
}

function isValidEmailDomain(email, allowedDomain = 'amherst.edu') {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  const domain = email.split('@')[1];
  return domain.toLowerCase() === allowedDomain.toLowerCase();
}