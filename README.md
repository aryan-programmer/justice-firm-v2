# Justice Firm

A comprehensive web platform connecting clients with legal professionals, featuring advanced search, appointment booking, and real-time communication.

## About The Project

Justice Firm is a full-stack web application designed to serve as a centralized platform where clients can easily find and hire lawyers based on their specific needs, and lawyers can register to offer their services. The existing system for finding legal help is often fragmented, requiring users to browse multiple firm-specific websites and conduct separate searches for contact information and location.

This application solves that problem by providing a single, consolidated directory with powerful search and communication tools, creating a seamless and efficient experience for both clients and legal professionals.

## Key Features

The application is built with three distinct user roles: **Client**, **Lawyer**, and **Administrator**.

#### For Clients:

- **Intuitive Registration & Login**: Secure account creation and authentication.
- **Advanced Lawyer Search**: Find lawyers by name, email, or physical location.
- **Geolocation Integration**: Automatically uses HTML5 Geolocation to find the user's current location and sort lawyers by proximity, showing the closest options first.
- **Appointment Booking**: Request appointments with lawyers, with an option to suggest a timestamp.
- **Real-time Chat**: Communicate directly with lawyers via a secure, in-app WebSocket-based chat system to discuss appointment details or case intricacies.
- **Document Management**: Upload images and documents relevant to a case into a consolidated repository.

#### For Lawyers:

- **Profile Management**: Register and manage a professional profile, including qualifications, location, and areas of specialization.
- **Admin Verification**: Submit legal certification documents for verification by an administrator before the profile goes live, ensuring authenticity.
- **Appointment Management**: View and manage incoming appointment requests from clients; confirm or reject them as per their schedule.
- **Case Upgradation**: Seamlessly upgrade a confirmed appointment into a formal case, migrating the chat history and creating a dedicated case space.

#### For Administrators:

- **Comprehensive Dashboard**: A central dashboard to manage and monitor all platform activity.
- **Lawyer Verification**: Review and verify the legal documents submitted by lawyers, with the ability to approve or reject applications.
- **User Oversight**: View detailed lists of all registered clients and lawyers on the platform.
- **Statistical Analysis**: Access graphical charts for statistical analysis of registered members and website visitors.

## 🛠️ Technology Stack

The project is built with a modern, robust, and scalable tech stack.

- **Frontend**:

  - **Framework**: [Vue 3](https://vuejs.org/)
  - **Language**: [TypeScript](https://www.typescriptlang.org/)
  - **UI Library**: [Vuetify 3](https://vuetifyjs.com/en/) (with custom styling using [Sass](https://sass-lang.com/))
  - **State Management**: [Pinia](https://pinia.vuejs.org/)

- **Backend (Serverless Architecture)**:

  - **Runtime**: [Node.js](https://nodejs.org/en)
  - **Language**: [TypeScript](https://www.typescriptlang.org/)
  - **Cloud Services**: [AWS Lambda](https://aws.amazon.com/lambda/) & [AWS API Gateway](https://aws.amazon.com/api-gateway/)
  - **Infrastructure Provisioning**: [AWS CDK](https://aws.amazon.com/cdk/)

- **Database**:

  - **Relational**: [MariaDB](https://mariadb.org/) (for user profiles, cases, appointments)
  - **NoSQL**: [AWS DynamoDB](https://aws.amazon.com/dynamodb/) (for real-time chat messages and WebSocket connection management)

- **Deployment & Protocols**:

  - **Frontend Hosting**: [Netlify](https://www.netlify.com/)
  - **Communication**: HTTPS for client-server communication
  - **Real-time Chat**: WebSocket over SSL/TLS (WSS) for real-time chatting

## 📄 Project Report

For a complete and in-depth explanation of the project's design, architecture, data flow diagrams, and implementation details, please see the full [project report](./project_report.pdf).

---

### ⚠️ **Project Status: Inactive**

Please be aware that the live version of this project is **currently non-functional**.

The backend services were hosted on an **AWS Free Tier** account which has since expired. This affects all server-dependent functionalities, including:

- User registration and authentication.
- Database operations (fetching lawyer/client data, appointments, cases).
- Real-time chat via WebSockets.
- File uploads.

The frontend may still be viewable, but it will not be able to communicate with the backend. The code remains available in this repository for demonstration and review purposes.
