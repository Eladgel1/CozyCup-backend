pipeline {
  agent any

  environment {
    PROJECT_DIR = 'C:\\Users\\eladg\\CozyCup-backend'
  }

  stages {
    stage('Install') {
      steps {
        dir("${env.PROJECT_DIR}") {
          bat 'npm ci'
        }
      }
    }

    stage('Lint') {
      steps {
        dir("${env.PROJECT_DIR}") {
          bat 'npm run lint'
        }
      }
    }

    stage('Prettier') {
      steps {
        dir("${env.PROJECT_DIR}") {
          bat 'npm run format'
        }
      }
    }

    stage('Tests') {
      steps {
        dir("${env.PROJECT_DIR}") {
          bat 'npm test'
        }
      }
    }

    stage('Docker Build (local)') {
      steps {
        dir("${env.PROJECT_DIR}") {
          bat 'docker build --target=prod -t cozycup-api:ci .'
        }
      }
    }
  }

  post {
    always {
      cleanWs()
    }
  }
}