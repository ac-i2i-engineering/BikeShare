/**
 * BikeShare Form Simulator Class
 * Handles simulation of checkout form submissions for testing
 * 
 * Form Structure:
 * [0] [Id=1337405542] Email: (TEXT)
 * [1] [Id=697424273] Scanned bike Hash-ID: (TEXT)
 * [3] [Id=998220660] Did you check if this bike's key is available at the front desk before you check it out? (MULTIPLE_CHOICE)
 * [4] [Id=1671678893] Confirm that this bike's condition is okay for you to ride before you submit this request. (MULTIPLE_CHOICE)
 */
// ===========================================================================
// Create the form responses and submit to trigger the onCheckoutFormSubmit function
// =============================================================================
class CheckoutFullSimulator {
  constructor(){
    this.formId = CONFIG.FORMS.CHECKOUT_FORM_ID;
    this.FIELD_IDS = CONFIG.FORMS.CHECKOUT_FIELD_IDS;
  }
  simulateCheckout(responseData = null) {
    // Default response data
    const defaultResponse = {
      userEmail: 'test003@amherst.edu',
      bikeHash: '3A8BD0',
      keyAvailable: 'Yes',
      conditionOk: ['I consent']
    };

    // Use provided data or default
    const formData = responseData || defaultResponse;

    try {
      const form = FormApp.openById(this.formId);
      const formResponse = form.createResponse();
      
      // Set value for each form item using IDs
      const userEmailItem = form.getItemById(this.FIELD_IDS.EMAIL).asTextItem();
      formResponse.withItemResponse(userEmailItem.createResponse(formData.userEmail));

      const bikeHashItem = form.getItemById(this.FIELD_IDS.BIKE_HASH).asTextItem();
      formResponse.withItemResponse(bikeHashItem.createResponse(formData.bikeHash));

      const keyAvailableCheckItem = form.getItemById(this.FIELD_IDS.KEY_AVAILABLE).asMultipleChoiceItem();
      formResponse.withItemResponse(keyAvailableCheckItem.createResponse(formData.keyAvailable));

      const conditionConfirmationItem = form.getItemById(this.FIELD_IDS.CONDITION_OK).asCheckboxItem();
      formResponse.withItemResponse(conditionConfirmationItem.createResponse(formData.conditionOk));

      // Submit the form response
      const submittedResponse = formResponse.submit();

      return {
        success: true,
        responseId: submittedResponse.getId(),
        timestamp: submittedResponse.getTimestamp(),
        formData: formData,
        message: 'Checkout simulation completed successfully'
      };
      
    } catch (error) {
      console.error('Error simulating checkout:', error);
      return {
        success: false,
        error: error.message,
        formData: formData
      };
    }
  }

  createCustomCheckout(userEmail, bikeHash, keyAvailable = 'Yes', conditionOk = ['I consent']) {
    const customData = {
      userEmail: userEmail,
      bikeHash: bikeHash,
      keyAvailable: keyAvailable,
      conditionOk: conditionOk
    };

    return this.simulateCheckout(customData);
  }

  simulateMultipleCheckouts(num=2,isRandom=true,root="test",defaultBike="King") {
    const results = [];
    for(let i=0;i<num;i++){
      let finalPart = i < 10 ? '00'+i : i < 100 ? '0'+i : i.toString();
      let emailAddress = root + finalPart+'@amherst.edu'
      let randomIndex = Math.floor(Math.random() * CONFIG.BIKE_HASHES.length);
      let bikeHash = isRandom ? CONFIG.BIKE_HASHES[randomIndex] : defaultBike;

      console.log(`\n-----Email:${emailAddress}-------Bike:${bikeHash}--------`)
      results.push(this.createCustomCheckout(emailAddress,bikeHash))
       // Small delay between submissions
      Utilities.sleep(3000);
    }

    return results;
  }
}

// ===========================================================================
// Simulate checkout by creating a spreadsheet entry then, call form submission functions manually
// ===========================================================================
class CheckoutVirtualSimulator{
    // add a new row to the checkout logs sheet
    constructor() {
      this.db = new DatabaseManager();
      this.checkoutSheet = CONFIG.SHEETS.CHECKOUT_LOGS.NAME;
    }

    createCheckoutEntry(email, bikeHash, keyAvailable = 'Yes', conditionOk = ['I consent']) {
        const entry = [
          new Date(),
          email,
          bikeHash,
          keyAvailable,
          conditionOk.toString()
        ];

        // Append the entry to the checkout logs sheet
        this.db.appendRow(this.checkoutSheet, entry);
        this.db.sortByColumn(null, this.checkoutSheet);

        // Return the entry
        return entry;
    }
}

function simulateFullCheckout() {
  const simulator = new CheckoutFullSimulator();
  return simulator.createCustomCheckout('test111@amherst.edu','4038A4','Yes');
  // return simulator.simulateMultipleCheckouts(5);
}

function simulateVirtualCheckout() {
  const simulator = new CheckoutVirtualSimulator();
  const response = simulator.createCheckoutEntry('test312@amherst.edu','3A8BD0');  
  simulateHandleOnFormSubmit(CONFIG.SHEETS.CHECKOUT_LOGS.NAME, response)
}
