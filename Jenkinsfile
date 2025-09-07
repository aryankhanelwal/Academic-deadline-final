/*
 * Academic Deadline Tracker - Minimal Jenkins CI/CD Pipeline
 * 
 * This consolidated pipeline handles:
 * - Code checkout and Docker build
 * - Push to Docker Hub and AWS ECR (ap-south-1)
 * - Deploy to Kubernetes with LoadBalancer
 * 
 * Prerequisites: Docker_Credentials, AWS_Credentials in Jenkins
 */

pipeline {
    agent any

    parameters {
        string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Docker image tag')
        choice(name: 'DEPLOYMENT_TYPE', choices: ['kubernetes', 'docker-compose'], description: 'Deployment method')
    }

    environment {
        REPO_URL = 'https://github.com/aryankhanelwal/Academic-deadline-final.git'
        DOCKER_HUB_REPO = 'aryankhandelwallll/academic-deadline'
        AWS_ACCOUNT_ID = '698031349056'
        AWS_REGION = 'ap-south-1'
        ECR_REPO = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/academic-deadline"
        EKS_CLUSTER = 'academic-deadline-cluster'
        K8S_NAMESPACE = 'academic-deadline'
    }

    stages {
        stage('Checkout & Build') {
            steps {
                git branch: 'main', url: "${REPO_URL}"
                script {
                    sh """
                        echo "🚀 Building Docker image..."
                        docker build -t ${DOCKER_HUB_REPO}:${IMAGE_TAG} .
                    """
                }
            }
        }

        stage('Push Images') {
            parallel {
                stage('Docker Hub') {
                    steps {
                        withCredentials([usernamePassword(credentialsId: 'Docker_Credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                            sh """
                                echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin
                                docker push ${DOCKER_HUB_REPO}:${IMAGE_TAG}
                                docker logout
                            """
                        }
                    }
                }
                stage('AWS ECR') {
                    steps {
                        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'AWS_Credentials']]) {
                            sh """
                                aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                                docker tag ${DOCKER_HUB_REPO}:${IMAGE_TAG} ${ECR_REPO}:${IMAGE_TAG}
                                docker push ${ECR_REPO}:${IMAGE_TAG}
                            """
                        }
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            when {
                expression { params.DEPLOYMENT_TYPE == 'kubernetes' }
            }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'AWS_Credentials']]) {
                    sh """
                        # Update kubeconfig
                        aws eks update-kubeconfig --name ${EKS_CLUSTER} --region ${AWS_REGION}
                        
                        # Create namespace
                        kubectl create namespace ${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
                        
                        # Create secrets
                        kubectl create secret generic app-secrets \
                            --from-literal=EMAIL_USER='2002ak2002@gmail.com' \
                            --from-literal=EMAIL_PASS='prgi uvhi dpri wlaz' \
                            --from-literal=SESSION_SECRET='a3b2f8d23c84c5eaf8dca92b21a1c9d739e24c88b9db19e88b0d4f5e7e1c6f9d' \
                            --from-literal=MONGO_INITDB_ROOT_USERNAME='root' \
                            --from-literal=MONGO_INITDB_ROOT_PASSWORD='password123' \
                            -n ${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
                        
                        # Update image in deployment
                        sed 's/IMAGE_PLACEHOLDER/${ECR_REPO}:${IMAGE_TAG}/g' k8s-minimal.yaml | kubectl apply -f -
                        
                        # Wait for deployment
                        kubectl rollout status deployment/academic-deadline-app -n ${K8S_NAMESPACE} --timeout=300s
                        
                        # Get LoadBalancer URL
                        echo "🌐 Getting LoadBalancer URL..."
                        kubectl get service academic-deadline-service -n ${K8S_NAMESPACE}
                    """
                }
            }
        }

        stage('Deploy with Docker Compose') {
            when {
                expression { params.DEPLOYMENT_TYPE == 'docker-compose' }
            }
            steps {
                sh """
                    # Create .env file
                    cat > .env << EOF
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb://mongodb:27017/test
EMAIL_USER=2002ak2002@gmail.com
EMAIL_PASS=prgi uvhi dpri wlaz
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
SESSION_SECRET=a3b2f8d23c84c5eaf8dca92b21a1c9d739e24c88b9db19e88b0d4f5e7e1c6f9d
EOF
                    
                    # Update docker-compose to use new image
                    sed -i 's/build: ./image: ${ECR_REPO}:${IMAGE_TAG}/g' docker-compose.yml
                    
                    # Deploy
                    docker compose down || true
                    docker compose up -d
                    
                    echo "✅ Application deployed at http://localhost:3000"
                """
            }
        }

    }

    post {
        always {
            sh 'docker system prune -f || true'
        }
        success {
            echo "✅ Pipeline completed successfully!"
        }
        failure {
            echo "❌ Pipeline failed. Check logs above."
        }
    }
}
