//=====================================================
// FORM EVENT LISTENER
//=====================================================
function handleOnFormSubmit(e) {
  const result = processFormSubmissionEvent(e);
  
  if (result.success) {
    Logger.log(`Successfully processed ${result.transaction?.type} for ${result.user?.userEmail}`);
  } else {
    Logger.log(`Failed to process event: ${result.errorMessage || 'Unknown error'}`);
  }
  
  return result;
}