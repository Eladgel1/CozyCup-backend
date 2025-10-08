pipeline {
  agent any

  options { ansiColor('xterm'); timestamps(); disableConcurrentBuilds() }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps { bat 'npm ci' }
    }

    stage('Lint') {
      steps { bat 'npm run lint' }
    }

    stage('Prettier') {
      steps { bat 'npm run format' }
    }

    stage('Tests') {
      steps { bat 'npm test' }
    }

    stage('Docker Build (local)') {
      steps {
        bat 'docker build --target=prod -t cozycup-api:ci .'
      }
    }
  }

  post {
    always { cleanWs() }
  }
}
