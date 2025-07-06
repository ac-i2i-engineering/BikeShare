# BikeShare
The Bike Share System is a platform that leverages G-Suite automation through Google Apps Script to streamline bike checkouts, returns, and inventory management.

# Design
The database in relational model.

## Tables and their Fields
### Bikes Status
Fields:
- **Bike ID**
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

**Encapsulation:**
- Each class encapsulates its data and related operations
- Private methods handle internal logic while public methods provide clean interfaces
- Database operations are abstracted through the DatabaseManager class

**Inheritance & Composition:**
- All model classes use DatabaseManager for data persistence
- Log classes inherit common functionality while implementing specific validation

**Polymorphism:**
- Static factory methods (fromSheetRow, fromFormResponse) create objects from different data sources
- Uniform interfaces for save() operations across all model classes

**Single Responsibility:**
- Bike class handles bike-specific operations (checkout, return, maintenance)
- User class manages user-specific data and operations
- Service class orchestrates business logic without knowing database details
- Log classes handle form processing and validation

#### Implementation Benefits:

1. **Maintainability:** Clear class boundaries make code easier to update and debug
2. **Reusability:** Classes can be easily extended for new features
3. **Testing:** Each class can be unit tested independently
4. **Scalability:** New bike types or user roles can be added through inheritance
5. **Error Handling:** Centralized error handling with proper exception propagation
