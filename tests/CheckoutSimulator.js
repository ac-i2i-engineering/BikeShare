/**
 * BikeShare Form Simulator Class
 * Handles simulation of checkout form submissions for testing
 * 
 * Form Structure:
 * [0] [Id=1337405542] Email: (TEXT)
 * [1] [Id=697424273] Enter the bike name/code from the key: (TEXT)
 * [2] [Id=1288559812] Confirm the bike name/code by entering it again: (TEXT)
 * [3] [Id=998220660] Did you check if this bike's key is available at the front desk before you check it out? (MULTIPLE_CHOICE)
 * [4] [Id=1671678893] Confirm that this bike's condition is okay for you to ride before you submit this request. (MULTIPLE_CHOICE)
 */
// ===========================================================================
// Create the form responses and submit to trigger the onCheckoutFormSubmit function
// =============================================================================
class CheckoutFullSimulator {
  constructor(){
    // Default form ID from configuration
    this.formId = CONFIG.FORMS.CHECKOUT_FORM_ID;
    
    // Form field IDs based on your checkout form structure
    this.CHECKOUT_FIELD_IDS = {
      EMAIL: 1337405542,
      BIKE_CODE: 697424273,
      CONFIRM_BIKE_CODE: 1288559812,
      KEY_AVAILABLE: 998220660,
      CONDITION_OK: 1671678893
    };
  }
  simulateCheckout(responseData = null) {
    // Default response data
    const defaultResponse = {
      userEmail: 'test003@amherst.edu',
      bikeCode: 'King',
      confirmBikeCode: 'King',
      keyAvailable: 'Yes',
      conditionOk: ['I consent']
    };

    // Use provided data or default
    const formData = responseData || defaultResponse;

    try {
      // Open the checkout form
      const form = FormApp.openById(this.formId);
      
      // Create a new form response
      const formResponse = form.createResponse();
      
      // Set value for each form item using IDs
      const userEmailItem = form.getItemById(this.CHECKOUT_FIELD_IDS.EMAIL).asTextItem();
      formResponse.withItemResponse(userEmailItem.createResponse(formData.userEmail));

      const bikeCodeItem = form.getItemById(this.CHECKOUT_FIELD_IDS.BIKE_CODE).asTextItem();
      formResponse.withItemResponse(bikeCodeItem.createResponse(formData.bikeCode));

      const confirmBikeCodeItem = form.getItemById(this.CHECKOUT_FIELD_IDS.CONFIRM_BIKE_CODE).asTextItem();
      formResponse.withItemResponse(confirmBikeCodeItem.createResponse(formData.confirmBikeCode));

      const keyAvailableCheckItem = form.getItemById(this.CHECKOUT_FIELD_IDS.KEY_AVAILABLE).asMultipleChoiceItem();
      formResponse.withItemResponse(keyAvailableCheckItem.createResponse(formData.keyAvailable));

      const conditionConfirmationItem = form.getItemById(this.CHECKOUT_FIELD_IDS.CONDITION_OK).asCheckboxItem();
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

  createCustomCheckout(userEmail, bikeCode,confirmCode, keyAvailable = 'Yes', conditionOk = ['I consent']) {
    const customData = {
      userEmail: userEmail,
      bikeCode: bikeCode,
      confirmBikeCode: confirmCode || bikeCode, //Auto-confirm when no confirm code given
      keyAvailable: keyAvailable,
      conditionOk: conditionOk
    };

    return this.simulateCheckout(customData);
  }

  simulateMultipleCheckouts(num=2,isRandom=true,root="test",defaultBike="King") {
    const results = [];
    for(let i=0;i<num;i++){
      let finalPart = i < 10 ? '00'+i : i < 100 ? '0'+i : i
      let emailAddress = root + finalPart+'@amherst.edu'
      let randomNumber = getRandomInteger(0, 9);
      let bikeCode = isRandom ? CONFIG.BIKE_NAMES[randomNumber] : defaultBike

      console.log(`\n-----Email:${emailAddress}-------Bike:${bikeCode}--------`)
      results.push(this.createCustomCheckout(emailAddress,bikeCode))
       // Small delay between submissions
      Utilities.sleep(500);
    }

    function getRandomInteger(min, max) {
      min = Math.ceil(min); // Ensure minimum is an integer
      max = Math.floor(max); // Ensure maximum is an integer
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    return results;
  }

  getTestScenarios() {
    return [
      {
        userEmail: 'student1@amherst.edu',
        bikeCode: 'Bike001',
        confirmBikeCode: 'Bike001',
        keyAvailable: 'Yes',
        conditionOk: ['I consent']
      },
      {
        userEmail: 'student2@amherst.edu',
        bikeCode: 'Bike002',
        confirmBikeCode: 'Bike002',
        keyAvailable: 'No', // Key not available
        conditionOk: ['I consent']
      },
      {
        userEmail: 'student3@amherst.edu',
        bikeCode: 'Bike003',
        confirmBikeCode: 'Bike004', // Mismatch in confirmation
        keyAvailable: 'Yes',
        conditionOk: ['I consent']
      },
      {
        userEmail: 'student4@amherst.edu',
        bikeCode: 'Bike004',
        confirmBikeCode: 'Bike004',
        keyAvailable: 'Yes',
        conditionOk: [] // No condition consent
      }
    ];
  }
}

// ===========================================================================
// Simulate checkout by creating a spreadsheet entry then, call form submission functions manually
// ===========================================================================
class CheckoutVirtualSimulator{
    // add a new row to the checkout logs sheet
    constructor() {
      this.db = new DatabaseManager();
      this.checkoutSheet = CONFIG.SHEETS.CHECKOUT_LOGS;
    }

    createCheckoutEntry(email, bikeCode, confirmCode, keyAvailable = 'Yes', conditionOk = ['I consent']) {
        const entry = [
          new Date(),
          email,
          bikeCode,
          confirmCode,
          keyAvailable,
          conditionOk.toString()
        ];

        // Append the entry to the checkout logs sheet
        this.db.appendRow(this.checkoutSheet, entry);

        // Return the entry
        return entry;
    }
}

function simulateFullCheckout() {
  const simulator = new CheckoutFullSimulator();
  return simulator.createCustomCheckout('test111@amherst.edu','Moore','Moore','No');
  // return simulator.simulateMultipleCheckouts(5);
}

function simulateVirtualCheckout() {
  const simulator = new CheckoutVirtualSimulator();
  simulator.createCheckoutEntry('test312@amherst.edu','Moore','Moore');  
  onFormSubmit(CONFIG.SHEETS.CHECKOUT_LOGS, debugging = true)
}
