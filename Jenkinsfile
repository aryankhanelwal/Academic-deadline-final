pipeline {
    agent any

    parameters {
        string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Docker image tag (e.g., v1.0)')
        string(name: 'CONTAINER_NAME', defaultValue: 'academic_deadline_app', description: 'App container name')
        string(name: 'HOST_PORT', defaultValue: '3000', description: 'Host port number')
    }

    environment {
        REPO_URL = 'https://github.com/aryankhanelwal/Academic_Deadline.git'
        BRANCH = 'master'
        DOCKER_HUB_REPO = 'aryankhandelwallll/academic-deadline'
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
                        echo "🚀 Building Docker image..."
                        docker build -t ${DOCKER_HUB_REPO}:${IMAGE_TAG} .
                    """
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'Docker_Credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                        echo "🔑 Logging in to Docker Hub..."
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        echo "📤 Pushing image to Docker Hub..."
                        docker push ${DOCKER_HUB_REPO}:${IMAGE_TAG}
                    """
                }
            }
        }

        stage('Push to AWS ECR') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'AWS_Credentials']]) {
                    sh """
                        echo "🔑 Logging in to AWS ECR..."
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                        
                        echo "📤 Tagging and pushing image to ECR..."
                        docker tag ${DOCKER_HUB_REPO}:${IMAGE_TAG} ${ECR_REPO}:${IMAGE_TAG}
                        docker push ${ECR_REPO}:${IMAGE_TAG}
                    """
                }
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                script {
                    echo "🚀 Deploying with Docker Compose..."
                    writeFile file: 'docker-compose.yml', text: """
version: '3.8'

services:
  mongodb:
    image: mongo:6.0-jammy
    container_name: academic_deadline_mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_DATABASE: test
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    networks:
      - academic_network

  app:
    image: ${ECR_REPO}:${IMAGE_TAG}
    container_name: ${CONTAINER_NAME}
    restart: unless-stopped
    ports:
      - "${HOST_PORT}:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MONGO_URI=mongodb://mongodb:27017/test
      - SESSION_SECRET=a3b2f8d23c84c5eaf8dca92b21a1c9d739e24c88b9db19e88b0d4f5e7e1c6f9d
      - EMAIL_USER=2002ak2002@gmail.com
      - EMAIL_PASS=prgi uvhi dpri wlaz
      - EMAIL_HOST=smtp.gmail.com
      - EMAIL_PORT=587
      - TWILIO_ACCOUNT_SID=ACee47a780e6b96d14076c87aa3fdaab64
      - TWILIO_AUTH_TOKEN=5436b2ee490659bc2b55e369d1cc0d3e
      - TWILIO_PHONE_NUMBER=+18788812691
    depends_on:
      - mongodb
    networks:
      - academic_network

volumes:
  mongodb_data:

networks:
  academic_network:
    driver: bridge
                    """
                    sh 'docker compose down || true'
                    sh 'docker compose up -d'
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
