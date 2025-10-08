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

    stage('Tests') {
      steps { bat 'npm run test' }
    }

    stage('Docker Build') {
      steps {
        bat 'npm run docker:build'
      }
    }
  }

  post {
    always { cleanWs() }
  }
}
