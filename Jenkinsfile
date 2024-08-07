#!/usr/bin/env groovy
library 'status-jenkins-lib@v1.8.8'

pipeline {
  agent { label 'linux' }

  options {
    disableConcurrentBuilds()
    /* manage how many builds we keep */
    buildDiscarder(logRotator(
      numToKeepStr: '20',
      daysToKeepStr: '30',
    ))
  }

  environment {
    GIT_COMMITTER_NAME = 'status-im-auto'
    GIT_COMMITTER_EMAIL = 'auto@status.im'
    NODE_OPTIONS = '--openssl-legacy-provider'
  }

  stages {
    stage('Git Prep') {
      steps {
        sh 'yarn clean'
      }
    }

    stage('Install Deps') {
      steps {
        sh 'yarn install --ignore-optional'
      }
    }

    stage('Build') {
      steps {
        script {
          sh 'yarn build'
          /* We run it again because VuePress is retarded */
          sh 'yarn build'
          jenkins.genBuildMetaJSON('docs/.vuepress/dist/build.json')
        }
      }
    }

    stage('Publish') {
      steps {
        sshagent(credentials: ['status-im-auto-ssh']) {
          sh """
            ghp-import \
              -b ${deployBranch()} \
              -c ${deployDomain()} \
              -p docs/.vuepress/dist
          """
         }
      }
    }
  }

  post {
    cleanup { cleanWs() }
  }
}

def isMasterBranch() { GIT_BRANCH ==~ /.*master/ }
def deployBranch() { isMasterBranch() ? 'deploy-master' : 'deploy-develop' }
def deployDomain() { isMasterBranch() ? 'libs.nimbus.team' : 'dev-libs.nimbus.team' }
