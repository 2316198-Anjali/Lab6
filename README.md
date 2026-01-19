<img width="2647" height="520" alt="image" src="https://github.com/user-attachments/assets/2a2b9987-42fc-4126-8547-92de06eb762b" /># My Learning Journal (PWA)

This learning Journal app is a small progressive web application, built with Flask, HTML, CSS and JavaScript, it let users to record their weekly reflections, and the app saves these to a online json file using python APIs.

Through the Journal page, user can add reflection, which saves through direct flask python API calls, or when the user is in offline mode, that data is saved to indexed database using service worker and cache mechanism, and whenever user gains access to internet, the app automatically syncs data with online json storage.

In the last, I added Mini Project extension in journal learning app, this extension added a new and unique feature to reflection saving, that with the user can even save a drawing with each canvas, user is given with a canvas, on which user can write with free hand tool, or can draw shapes like rectangle, circle or line. This feature enhances the overall effectiveness of app.

## Features

**Responsive**: whole application is responsive, it can used from a full screen of pc, or from a mobile device
**PWA**: it is built as a PWA, user can install the app on PC or a mobile device
**Works Offline**: user can work offline, can do all things like saving reflection, and when user got back online, the app syncs data with online server
**Robust**: works effectively without any errors
**Fast**: Can save or retrieve data from json storage without spending too much time.
**Creative**: with the canvas feature, user can draw using freehand pen, and can save that as a image with reflections
**Export**: user can export all the saved reflection to a json file


## Pages

- `Home` – basic landing page with “Coming Soon” content.
- `Journal` – main reflective journal with form validation.
- `Projects` – placeholder for future project work.
- `About` – short profile (name, course, institution, interests, goals).

## Technologies Used

**HTML**: used for web pages
**CSS**: used for styling the pages
**JavaScript**: handles validation, update live data/time, navigation, and also used for all the PWA logics, like installing app
**Indexed DB**: used to store reflections locally. Plays a main role in offline working
**JSON File** Storage: used for storing reflections in a json format
**HTML Canvas**: used for creating freehand darwing for saving with each reflection
**Flask (Python)**: used as a backend web server, and serves html pages, also for saving and reading data from json file

## Tool & platform Used

**Visual Studio Code**: I sued it as main IDE for developing all the labs, also used this to push code to github
**Android Studio**: used this in lab 1, when I have write and complie the code for a android app
**GitHub**: used this as version control tool, the full project is pushed to github repository with detailed commits
**PythonAnyWhere**: used to host the Flask (python) backend




