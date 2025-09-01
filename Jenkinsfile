pipeline {
    agent any

    parameters {
        string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Docker image tag (e.g., v1.0)')
        string(name: 'CONTAINER_NAME', defaultValue: 'academic-container', description: 'Docker container name')
        string(name: 'HOST_PORT', defaultValue: '8080', description: 'Host port number')
    }

    environment {
        REPO_URL = 'https://github.com/aryankhanelwal/Academic_Deadline.git'
        BRANCH = 'master'
        DOCKER_HUB_REPO = 'aryankhandelwallll/academic-deadline'  // update if needed
        AWS_REGION = 'ap-south-1'
        AWS_ACCOUNT_ID = '698031349056'
        ECR_REPO = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/aryankhandelwal"
    }

    stages {

        stage('Checkout Code') {
            steps {
                git branch: "${BRANCH}", url: "${REPO_URL}"
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    sh """
                        echo "Building Docker image..."
                        docker build -t ${DOCKER_HUB_REPO}:${IMAGE_TAG} .
                    """
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'Docker_Credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                        echo "Logging in to Docker Hub..."
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        echo "Pushing image to Docker Hub..."
                        docker push ${DOCKER_HUB_REPO}:${IMAGE_TAG}
                    """
                }
            }
        }

        stage('Push to AWS ECR') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'AWS_Credentials']]) {
                    sh """
                        echo "Logging in to AWS ECR..."
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                        
                        echo "Tagging and pushing image to ECR..."
                        docker tag ${DOCKER_HUB_REPO}:${IMAGE_TAG} ${ECR_REPO}:${IMAGE_TAG}
                        docker push ${ECR_REPO}:${IMAGE_TAG}
                    """
                }
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                script {
                    echo "Deploying container using Docker Compose..."
                    writeFile file: 'docker-compose.yml', text: """
                    version: '3.8'
                    services:
                      ${CONTAINER_NAME}:
                        image: ${ECR_REPO}:${IMAGE_TAG}
                        container_name: ${CONTAINER_NAME}
                        ports:
                          - "${HOST_PORT}:3000"
                        restart: always
                    """
                    sh 'docker-compose -f docker-compose.yml up -d'
                }
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline completed successfully!"
        }
        failure {
            echo "❌ Pipeline failed. Please check the console logs."
        }
    }
}
