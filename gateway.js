//=====================================================
// FORM EVENT LISTENER
//=====================================================
function handleOnFormSubmit(e) {
  const result = processFormSubmissionEvent(e);
  
  if (result.success) {
    Logger.log(`Successfully processed ${result.transaction?.type || 'unknown'} for ${result.user?.userEmail || 'unknown user'}`);
  } else {
    const txType = result.transaction?.type || result.context?.operation || 'unknown';
    const userEmail = result.user?.userEmail || result.formData?.userEmail || 'unknown user';
    Logger.log(`Failed to process ${txType} for ${userEmail}: ${result.errorMessage || 'Unknown error'}`);
  }
  
  return result;
}