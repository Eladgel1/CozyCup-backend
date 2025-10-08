pipeline {
  agent any

  options { ansiColor('xterm'); timestamps(); disableConcurrentBuilds() }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install dependencies') {
      steps {
        dir('CozyCup-backend') {
          bat 'npm ci'
        }
      }
    }

    stage('Lint') {
      steps {
        dir('CozyCup-backend') {
          bat 'npm run lint'
        }
      }
    }

    stage('Prettier') {
      steps {
        dir('CozyCup-backend') {
          bat 'npm run format'
        }
      }
    }

    stage('Tests') {
      steps {
        dir('CozyCup-backend') {
          bat 'npm test'
        }
      }
    }

    stage('Docker Build') {
      steps {
        dir('CozyCup-backend') {
          bat 'npm run docker:build'
        }
      }
    }
  }

  post {
    always { cleanWs() }
  }
}
