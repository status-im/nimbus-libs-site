#!/usr/bin/env groovy
library 'status-jenkins-lib@v1.8.8'

pipeline {
  agent {
    docker {
      label 'linuxcontainer'
      image 'harbor.status.im/infra/ci-build-containers:linux-base-1.0.0'
      args '--volume=/nix:/nix ' +
           '--volume=/etc/nix:/etc/nix ' +
           '--user jenkins'
    }
  }

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
        script {
          nix.develop('yarn clean', pure: false)
        }
      }
    }

    stage('Install Deps') {
      steps {
        script {
          nix.develop('yarn install --ignore-optional', pure: false)
        }
      }
    }

    stage('Build') {
      steps {
        script {
          nix.develop('yarn build', pure: false)
          /* We run it again because VuePress is retarded */
          nix.develop('yarn build', pure: false)
          jenkins.genBuildMetaJSON('docs/.vuepress/dist/build.json')
        }
      }
    }

    stage('Publish') {
      steps {
        sshagent(credentials: ['status-im-auto-ssh']) {
          script {
            nix.develop("""
              ghp-import \
                -b ${deployBranch()} \
                -c ${deployDomain()} \
                -p docs/.vuepress/dist
            """, pure: false)
          }
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
