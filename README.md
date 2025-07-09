# BikeShare
The Bike Share System is a platform that leverages G-Suite automation through Google Apps Script to streamline bike checkouts, returns, and inventory management.

# Design
The database in relational model.

## Tables and their Fields
### Bikes Status
Fields:
- **Bike ID**
- **Size**
- **Maintenance status**
- **Availability**
- **Last checkout date**
- **Last return date**
- **Current Usage Timer**
- **Total Usage Hours**
- **Most Recent User**
- **2nd Recent User**
- **3rd Recent User**
- **TempRecent (Hidden)**

### User status
Fields:
- **Email**
- **Has unreturned bike**
- **Last checkout ID & Date**
- **Last return ID & Date**
- **# of checkouts**
- **# of returns**
- **# of mismatches**
- **# of usage hours**
- **# of overdue returns**
- **# first usage date**

### Checkout Logs
Fields:
- **Timestamp**
- **Email Address**
- **Enter the bike name/code from the key**
- **Confirm the bike name/code by entering it again**
- **Did you check if this bike’s key is available at the front desk before you check it out?**
- **Confirm that this bike's condition is okay for you to ride before you submit this request**

### Return Logs
Fields:
- **Timestamp**
- **Email Address**
- **Enter your Student ID**
- **Bike Name/Code**
- **Confirm Bike Name/Code**
- **Did you ride the bike with the actual code/name you checked out?**
- **If you did not or are not sure you rode the bike with the actual ID you checked out, please explain why.**
- **Are you returning on behalf of a friend?**
- **If you are returning on behalf of a friend, what is their name and/or email?**
- **Are there any errors/issues/concerns you'd like us to know about?**


### Report(system snapshots)
Fields:
- **Timestamp**
- **Recorded By**
- **Week**
- **Total # of Bikes**
- **Total # of Bikes in Repair**
- **# of Checked Out**
- **# of Overdue Bikes**
- **Available Bikes**
- **New users**
- **Late returners**
- **# of return mismatches**
- **emails with mismatches**
- **# of reported issues**
- **Total # of usage hrs**
- **Admin notes**

### Entity Relationship Diagram (ERD)
coming soon

## Object-Oriented Programming (OOP) Design

#### Core Classes:
1. **DatabaseManager** - Base class for all database operations with Google Sheets
2. **Bike** - Represents individual bikes with their status and operations
3. **User** - Represents system users with their checkout history and status
4. **CheckoutLog** - Handles checkout form submissions and validation
5. **ReturnLog** - Handles return form submissions and validation  
6. **Report** - Generates system snapshots and analytics
7. **BikeShareService** - Main service layer that orchestrates all operations

## Bike Names to Hash Spreadsheet Formula
To convert bike names to hash values, use the following formula in Google Sheets:
```excel
=UPPER(CONCAT(DEC2HEX(MOD(SUM(CODE(MID(A10,ROW(INDIRECT("1:"&LEN(A10))),1)))*13, 4096),3), DEC2HEX(MOD(SUM(CODE(MID(A10,ROW(INDIRECT("1:"&LEN(A10))),1)))*LEN(A10)*7, 4096),3)))
```
## Pre-fill link creation for Google Forms
To create pre-filled links for Google Forms, use the following format:
```excel
="https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.FIELD_ID=" & A1
```
Replace `FORM_ID` with your form's ID and `FIELD_ID` with the specific field ID you want to pre-fill. The value in cell `A1` will be automatically filled in the form.

## Generate QR Codes for URLS
To generate QR codes for URLs, you can use the following Google Sheets formula:
```excel
=IMAGE("https://quickchart.io/qr?text="&ENCODEURL(N2))
```
Replace `N2` with the cell containing the URL you want to convert into a QR code. This will generate a QR code image that can be scanned to access the URL directly.