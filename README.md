# Todo List App with Sprint Planning

A modern todo list application with sprint planning and reflection features, built with React and Firebase.

## Features

- Create, update, and delete todos
- Track todo status (Todo, In Progress, Completed)
- Weekly task organization
- Sprint reflection and planning section
- Real-time data persistence with Firebase
- Modern, responsive UI

## Tech Stack

- React
- TypeScript
- Firebase (Firestore)
- CSS3

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a Firebase project and update the configuration in `src/firebase.ts`
4. Start the development server:
   ```bash
   npm run dev
   ```

## Firebase Setup

1. Create a new Firebase project
2. Enable Firestore Database
3. Update the Firebase configuration in `src/firebase.ts` with your project credentials
4. Set up Firestore security rules for development:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
5. Set up Firestore security rules for production:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }

## License

MIT
