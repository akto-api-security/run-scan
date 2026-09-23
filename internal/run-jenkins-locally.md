for mac

run jenkins locally, with docker support inside jenkins by mounting host docker inside.

replace <user> with your user
to check user: ls -la /var/run/docker.sock

0.
ls -la /Users/<user>/.docker/run/docker.sock
sudo chmod 666 /Users/<user>/.docker/run/docker.sock

1. 
docker run -p 8000:8080 -p 50001:50000 --restart=on-failure -v /Users/<user>/.docker/run/docker.sock:/var/run/docker.sock -v ./jenkins_home:/var/jenkins_home --name jenkins jenkins/jenkins:lts-jdk21

2. 
docker exec -it --user root jenkins bash
apt-get update
apt-get install -y docker.io
usermod -aG docker jenkins
chmod 666 /var/run/docker.sock
docker ps

3. 
docker exec -it jenkins bash
docker ps