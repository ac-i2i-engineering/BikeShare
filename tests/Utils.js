function printFormFieldInfo(formId){
  const form = FormApp.openById(formId);
  form.getItems().forEach(item=>{
    console.log(`ID: ${item.getId()}, Title: ${item.getTitle()}, Type: ${item.getType()}`);
  });
}