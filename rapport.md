# Projet Cassiopée

## Synthèse

Le projet est le suivant : Il est possible de remarquer un début d'obsolescence en ce qui concerne les plateformes de Travaux Pratiques "virtuels", encore plus aujourd'hui avec le contexte sanitaire.

L'idée est alors de mettre en place une plateforme de la sorte qui va s'exécuter sur un Cloud Privé, donnant alors accès aux étudiants à des plateformes de développement à partir d'un simple navigateur web.

Ainsi, le projet est le déploiement d'une plateforme Eclipse Che s'exécutant sur un cloud SaaS openshift, permettant alors aux étudiants et aux professeurs d'avoir accès à des environnements de développement, tout en s'inscrivant dans la charte des services déployés par l'école (Authentification Shibboleh, etc...).

Le projet s'inscrit alors dans le cadre de l'amélioration des plateformes de TP virtuels pour les différentes écoles du groupe IMT.

Dans ce document, nous décrivons la mise en place des différents outils nécessaires et donnons des éléments théoriques de base pour comprendre le fonctionnement.

L'environnement est le suivant :

Nous avons 1 serveur dont les caractéristiques sont :

- Processeur: 96 x AMD EPYC 7352 24-Core Processor (2 Sockets)
- RAM: 377,44 GB

L'intégration sera faite dans un réseau déjà existant (celui de la DISI).

## Déploiement d'un cluster OKD sur proxmox (Pratique)

Dans un premier temps, il est nécessaire de déployer un cluster OKD qui nous servira de support pour déployer Eclipse Che.

#### Mention spéciale

Cette documentation est basée sur un guide<sup>(1)</sup> présent sur itnext.io écrit par Craig Robinson. Notre objectif est d'adapter cette documentation sur un environnement Proxmox pour en faciliter le déploiement.

### Architecture

Dans un premier temps, pour déployer le cluster il faut décider d'une [architecture](https://docs.okd.io/latest/architecture/architecture.html) pour ce dernier.
Pour ce cluster nous utiliserons l'architecture suivante :
![Architecture du cluster](https://raw.githubusercontent.com/DzeCin/Cassiopee2021/master/source_files/architecture_cassiop.jpg)
Quant aux VM voici leur description :
|Machine| OS | vCPU | RAM (Go) | Stockage (Go) | Addresse IP
|--|--|--|--|--|--|
|services|CentOS 8|4|4|100|10.0.0.1 et ip publique|
|master 1|Fedora CoreOS 8|4|16|120|10.0.0.2|
|master 2|Fedora CoreOS 8|4|16|120|10.0.0.3|
|master 3|Fedora CoreOS 8|4|16|120|10.0.0.4|
|worker 1|Fedora CoreOS 8|4|16|120|10.0.0.5|
|worker 2|Fedora CoreOS 8 |4|16|120|10.0.0.6|
|bootstrap|Fedora CoreOS 8|4|16|120|10.0.0.7|

<!--end of table-->

Dans cette architecutre nous avons décidé de regrouper au sein de la VM `services` le DNS, Load Balances, Serveur Web, Routeur, DHCP et le pare-feu. Une variante<sup>(1)</sup> de cette architecture pourrait être d'isoler le pare-feu, routeur et DHCP sous une VM FreeBSD.
| NOTE: Pour ce déploiement, nous omettrons pour l'instant l'utilisation d'un pare-feu. |
| --- |

### Création du pont au sein de Proxmox

Pour que les VMs master 1 à bootstrap puissent communiquer entre elles ils faut les inscrire dans un sous-réseau, ainsi il faut créer un pont dans Proxmox comme suit :

![Création du bridge](https://raw.githubusercontent.com/DzeCin/Cassiopee2021/master/source_files/proxmox_vmbr.png)
Note: Vous pouvez aussi utiliser le script 'vmbr.py' qui créera un pont automatiquement.

Une fois ceci fait nous pouvons passer à la création des VMs.

### Création et configuration des VMs

Avant de créer les VMs il faut fournir à Proxmox les OS nécessaires à la création de ces dernières. Pour ce faire rendez-vous dans votre stockage et dans l'onglet "ISO Images" ajoutez les images de [CentOS](https://www.centos.org/download/) et de [Fedora CoreOS](https://getfedora.org/coreos/download?tab=cloud_launchable&stream=stable).

#### VM : Services

##### Création et configuration de la VM

Nous allons débuter le déploiement par la création de la machine virtuelle "services". Depuis votre nœud créez une VM en remplissant les informations suivantes :

- OS : CentOS-8...
- Hard Disk : Disk Size : 100
- CPU : Cores : 4
- Memory : 4096
- Network : Ici choisissez l'un des ponts sur lequel votre VM communiquera
  <!-- end of the list -->
  Une fois la VM créée, rendez-vous dans l'onglet "Hardware" de cette dernière et ajoutez-y un nouveau périphérique réseau avec le second pont.

##### Installation et configuration de l'OS

On peut dès à présent lancer l'installation de l'OS.
L'installation étant indépendante du service de virtualisation, cette dernière se passe comme dans la documentation mentionnée précédemment :

> I prefer to use the “Standard Partition” storage configuration without mounting storage for /home. On the “Installation Destination” page, click on Custom under Storage Configuration, then Done.
> ![Image for post](https://miro.medium.com/max/949/1*fuXQBF2_bvBAAofRgfGORg.png)
>
> On the Manual Partitioning page, select Standard Partition, then click “Click Here to Create them automatically.”
> ![Image for post](https://miro.medium.com/max/949/1*4bK9WydcQeFA8q4TwQPOEA.png)
>
> Select the “/home” partition and click the “-” to delete it.
> ![Image for post](https://miro.medium.com/max/952/1*1QyfdiG1mE-nYixTsHFHoQ.png)
>
> Remove the contents of the “Desired Capacity” field, so it is blank and click Done, then Accept the changes.
> ![Image for post](https://miro.medium.com/max/950/1*MhKEWGBiQj0DtYm8xfvCAw.png)
>
> Bien qu'il est indiqué de choisir une VM avec interface graphique, nous avons fait le choix d'une VM sans interface graphique soit "server", par soucis d'optimisation et parce qu’une interface graphique ne présente pas de réel avantage pour l'utilisation dans ce cluster.
> For Software Selection, use Server with GUI and add the Guest Agents.
> ![Image for post](https://miro.medium.com/max/948/1*lotoyM4iL_2FEJnLWsgHjg.png)
>
> Pour cette étape, veillez à ce que votre interface réseau ayant accès à internet soit allumée et fonctionnelle. Pour l'autre interface, il n'est pas nécessaire de
> ![Image for post](https://miro.medium.com/max/947/1*O5EFyroqPFy02wMESvujnA.png)
>
> Click “Begin Installation” to start the install.
> ![Image for post](https://miro.medium.com/max/946/1*dMp6XAokjDrjdR2qChWLfw.png)
>
> Set the Root password, and create an admin user.
> ![Image for post](https://miro.medium.com/max/950/1*98LZMbkXxh15JK0b-4iP8Q.png)
>
> After the installation has completed, login, and update the OS.
>
> ```
> sudo dnf install -y epel-release
> sudo dnf update -y
> sudo systemctl restart
> ```

#### VM : bootstrap, masters et workers

Les VM restantes peuvent maintenant être créées, toutes les installations sont similaires on décrira ainsi une unique installation ici, celle de master1 :

- OS : fedora-coreos...
- Hard Disk : Disk Size : 120 GiB
- CPU : Cores : 4
- Memory : 16384 MiB
- Network : Ici choisissez le pont créé plus tôt pour la communication interne des VM
<!--end of list-->

Ces VMs peuvent être déployés plus rapidement à l'aide du script "Cluster.py" présent dans le dépôt git. Il vous suffit d'avoir une clé API sur Proxmox.

#### VM : Services

##### Configuration du DHCP

Selon le serveur DHCP que vous utilisez, la configuration sera différente. Dans le cas de dhcpd, nous allons le configurer (dans /etc/dhcp/dhcpd.conf) de manière à associer à chaque adresse MAC des VM l'adresse IP correspondante décrite précédemment :

```
subnet 10.0.0.0 netmask 255.255.255.0 {
    range dynamic-bootp 10.0.0.15 10.0.0.30;
    option broadcast-address 10.0.0.255;
    option routers 10.0.0.1;

group{

host master1 {
                hardware ethernet <adresse MAC de la VM master1>;
                fixed-address 10.0.0.2;
       }
       ...
host bootstrap {
                hardware ethernet <adresse MAC de la VM bootstrap>;
                fixed-address 10.0.0.7;
        }
  }
}
```

A la fin de la configuration, redémarrez votre service, dans le cas de dhcpd :

```
service dhcpd restart
```

##### Configuration des différents services

Pour la configuration suivante on se basera une fois de plus sur la documentation citée plus haut, les fichiers utilisés seront donc trouvés par la même procèdure qu'énoncé dans ce dernier :

> Open a terminal on the okd4-services VM and clone the okd4_files repo that contains the DNS, HAProxy, and install-conf.yaml example files:
>
> ```
> cd
> git clone https://github.com/cragr/okd4_files.git
> cd okd4_files
> ```

| NOTE: Pour ce déploiement, nous utiliserons un wildcard DNS (.nip.io ici) pour notre adresse IP publique |
| -------------------------------------------------------------------------------------------------------- |

<!-- Ajouter un lien git pour nos fichiers de configuration par ici-->

##### Configuration du DNS

Une fois les fichiers récupérés, nous pouvons continuer la configuration à l'identique en prenant soin de modifier les fichiers pour qu'ils correspondent à notre infrastructure.

> Copy the named config files and zones:
>
> ```
> sudo cp named.conf /etc/named.conf
> sudo cp named.conf.local /etc/named/
> sudo mkdir /etc/named/zones
> sudo cp db* /etc/named/zones
> ```
>
> Enable and start named:
>
> ```
> sudo systemctl enable named
> sudo systemctl start named
> sudo systemctl status named
> ```
>
> Restart the network services on the okd4-services VM:
> `sudo systemctl restart NetworkManager`
>
> Test DNS on the okd4-services.
>
> ```
> dig okd.local
> dig –x 192.168.1.210
> ```

##### Installation du LoadBalancer

On passe maintenant à l'installation du LoadBalancer :

> `sudo dnf install haproxy -y`
>
> Copy haproxy config from the git okd4_files directory :
> `sudo cp haproxy.cfg /etc/haproxy/haproxy.cfg`
>
> Start, enable, and verify HA Proxy service:
>
> ```
> sudo setsebool -P haproxy_connect_any 1
> sudo systemctl enable haproxy
> sudo systemctl start haproxy
> sudo systemctl status haproxy
> ```

##### Installation du serveur web

Pour ce déploiement nous avons fait le choix d'utiliser nginx, les étapes d'installation sont donc les suivantes :

```
sudo dnf install -y nginx
```

On change ensuite le port du service pour qui l'écoute sur le 8080 :

```
sudo sed -i 's/Listen 80/Listen 8080/' /etc/nginx/nginx.conf
```

Finalement on active et démarre le service :

```
sudo systemctl enable nginx
sudo systemctl start nginx
```

On peut éventuellement tester le serveur web via :

```
curl localhost:8080
```

qui devrait nous donner le code source d'une page web en sortie.

### Installation et configuration des éléments du cluster OKD

#### VM : services

##### Téléchargement des images nécessaires

Depuis le [git du projet OKD](https://github.com/openshift/okd/releases) récupérez les fichiers de l'oc client et de l'openshift-install. Vous trouverez sur [ce lien](https://origin-release.apps.ci.l2s4.p1.openshiftapps.com/) une liste des fichiers mis à jour.
Poursuivez ensuite en remplançant par les liens trouvés au préalable :

> ```
> cd
> wget https://github.com/openshift/okd/releases/download/4.5.0-0.okd-2020-07-29-070316/openshift-client->linux-4.5.0-0.okd-2020-07-29-070316.tar.gz
> wget https://github.com/openshift/okd/releases/download/4.5.0-0.okd-2020-07-29-070316/openshift-install->linux-4.5.0-0.okd-2020-07-29-070316.tar.gz
> ```
>
> Extract the okd version of the oc client and openshift-install:
>
> ```
> tar -zxvf openshift-client-linux-4.5.0-0.okd-2020-07-29-070316.tar.gz
> tar -zxvf openshift-install-linux-4.5.0-0.okd-2020-07-29-070316.tar.gz
> ```
>
> Move the kubectl, oc, and openshift-install to /usr/local/bin and show the version:
>
> ```
> sudo mv kubectl oc openshift-install /usr/local/bin/
> oc version
> openshift-install version
> ```

##### Configuration de l'openshift-installer

> In the install-config.yaml, you can either use a pull-secret from RedHat or the default of “{“auths”:{“fake”:{“auth”: “bar”}}}” as the pull-secret.
>
> Generate an SSH key if you do not already have one.
>
> ```
> ssh-keygen
> ```
>
> Create an install directory and copy the install-config.yaml file:
>
> ```
> cd
> mkdir install_dir
> cp okd4_files/install-config.yaml ./install_dir
> ```
>
> Edit the install-config.yaml in the install_dir, insert your pull secret and ssh key, and backup the install-config.yaml as it will be deleted in the next step:
>
> ```
> vim ./install_dir/install-config.yaml
> cp ./install_dir/install-config.yaml ./install_dir/install-config.yaml.bak
> ```
>
> Generate the Kubernetes manifests for the cluster, ignore the warning:
>
> ```
> Dans notre cas nous avons aussi modifié légèrement le fichier install-config.yaml pour modifier les adresses IP données aux différents nœuds. En se référant à la [documentation officielle](https://docs.okd.io/latest/installing/installing_platform_agnostic/installing-platform-agnostic.html#installation-bare-metal-config-yaml_installing-platform-agnostic) on doit donc modifier le point (9) pour y mettre
> ```

```
serviceNetwork:
-  10.0.0.0/16
```

> openshift-install create manifests --dir=install_dir/
>
> ```
> Modify the cluster-scheduler-02-config.yaml manifest file to prevent Pods from being scheduled on the control plane machines:
> ```
>
> sed -i 's/mastersSchedulable: true/mastersSchedulable: False/' install_dir/manifests/cluster-scheduler-02-config.yml
>
> ```
> Create manifests/cluster-network-03-config.yml and modify it to fit out network configuration:
> ```

```yaml
apiVersion: operator.openshift.io/v1
kind: Network
metadata:
  name: cluster
spec:
  defaultNetwork:
    openshiftSDNConfig:
      mtu: 1400
```

> ```
> Now you can create the ignition-configs:
> ```
>
> openshift-install create ignition-configs --dir=install_dir/
>
> ```
> **Note:**  If you reuse the install_dir, make sure it is empty. Hidden files are created after generating the configs, and they should be removed before you use the same folder on a 2nd attempt.
> ```

##### Hébergement des ignition files sur le serveur web

> Create okd4 directory in /var/www/html:
>
> ```
> sudo mkdir /var/www/html/okd4
> ```
>
> Copy the install_dir contents to /var/www/html/okd4 and set permissions:
>
> ```
> sudo cp -R install_dir/* /var/www/html/okd4/
> sudo chown -R apache: /var/www/html/
> sudo chmod -R 755 /var/www/html/
> ```
>
> Test the webserver:
>
> ```
> curl localhost:8080/okd4/metadata.json
> ```
>
> Download the [Fedora CoreOS](https://getfedora.org/coreos/download/) bare-metal bios image and sig files and shorten the file names:
>
> ```
> cd /var/www/html/okd4/
> sudo wget >https://builds.coreos.fedoraproject.org/prod/streams/stable/builds/32.20200715.3.0/x86_64/fedora-coreos-32.20200715.3.0-metal.x86_64.raw.xz
> sudo wget >https://builds.coreos.fedoraproject.org/prod/streams/stable/builds/32.20200715.3.0/x86_64/fedora-coreos-32.20200715.3.0-metal.x86_64.raw.xz.sig
> sudo mv fedora-coreos-32.20200715.3.0-metal.x86_64.raw.xz fcos.raw.xz
> sudo mv fedora-coreos-32.20200715.3.0-metal.x86_64.raw.xz.sig fcos.raw.xz.sig
> sudo chown -R apache: /var/www/html/
> sudo chmod -R 755 /var/www/html/
> ```

> :warning: **Sur toutes les vms**: taper nmtui puis configurer le MTU à 1450 (cf la partie sur le MTU)

#### Démarrage de la VM bootstrap:

> Power on the odk4-bootstrap VM. Press the TAB key to edit the kernel boot options and add the following:
>
> coreos.inst.install_dev=/dev/sda coreos.inst.image_url=http://192.168.1.210:8080/okd4/fcos.raw.xz >coreos.inst.ignition_url=http://192.168.1.210:8080/okd4/**bootstrap.ign**
>
> ![Image for post](https://miro.medium.com/max/644/1*HFEx62qxUMZaC9rheNXhjg.png)
>
> You should see that the fcos.raw.gz image and signature are downloading:
>
> ![Image for post](https://miro.medium.com/max/804/1*F2aQbmDxM0TV-X-mDEhOgA.png)

#### Démarrage des master

> Power on the control-plane nodes and press the TAB key to edit the kernel boot options and add the following, then press enter:
>
> coreos.inst.install_dev=/dev/sda coreos.inst.image_url=http://192.168.1.210:8080/okd4/fcos.raw.xz >coreos.inst.ignition_url=http://192.168.1.210:8080/okd4/**master.ign**
>
> ![Image for post](https://miro.medium.com/max/647/1*zMsj7lU9NZSUMS0hkZQEQA.png)
>
> You should see that the fcos.raw.gz image and signature are downloading:
>
> ![Image for post](https://miro.medium.com/max/805/1*066Mq8c8LDK0r-C_0P8Vdg.png)

#### Démararge des worker

> Power on the control-plane nodes and press the TAB key to edit the kernel boot options and add the following, then press enter:
>
> coreos.inst.install_dev=/dev/sda coreos.inst.image_url=http://192.168.1.210:8080/okd4/fcos.raw.xz >coreos.inst.ignition_url=http://192.168.1.210:8080/okd4/**worker.ign**
>
> ![Image for post](https://miro.medium.com/max/645/1*RcrNt6_cy8t1eI2bkwlP8g.png)
>
> You should see that the fcos.raw.gz image and signature are downloading:
>
> ![Image for post](https://miro.medium.com/max/805/1*HRI8MwStXddiVLPZrZ3PyA.png)
>
> It is usual for the worker nodes to display the following until the bootstrap process complete:
>
> ![Image for post](https://miro.medium.com/max/724/1*lQnBIHp7lsjjwV49FzgS5Q.png)

## Installation d'Eclipse Che

Rendez-vous dans OperatorHub puis installez l'opérateur Eclipse Che. Cliquez ensuite sur celui-ci puis sur "Create CheCluster". Définissez les paramètres comme souhaités. N'oubliez pas de désactiver l'authentification OpenShift dans l'onglet Auth.

Attendez que les différents composants d'Eclipse Che se déploient. Puis visitez l'url donnée pour accéder au dashboard EclipseChe.

### Ajout d'une méthode d'authentification

Ici, nous allons utiliser un LDAP comme méthode d'authentification. Nous avons déployé celui-ci grâce à OpenLdap et nous ne décrirons pas le processus de déploiement ici.

#### 1/ Identifiants admin de keycloack

Premièrement, il faut récupérer les identifiants administrateurs de Keycloak.

- Sur le dashboard OKD, allez dans "Operators ⇒ Installed Operators ⇒ Eclipse Che ⇒ Eclipse Che Cluster" sélectionnez le cluster Che que vous venez de déployer puis cliquez sur "Resourcers".
- Sélectionnez le "che-identity-secret" puis scrollez en bas. Vous pourrez alors récupérer les identifiants pour Keycloak.

#### 2/ Utiliser le LDAP comme méthode d'authentification

Rendez vous sur le lien Keycloak et connectez vous avec les identifiants précédemment récupérés.

Vous pouvez alors aller dans "User Federation" ⇒ "Add provider" et sélectionnez LDAP. Remplissez les informations de votre serveur LDAP. Vous pourrez alors utiliser le LDAP comme méthode d'authentification pour Eclipse Che.

### Ajouter des utlisateurs sur le LDAP

> :warning: **Cette partie ne s'applique qu'au LDAP de notre projet**

Nous utilisons Ldap Manager pour avoir une interface graphique.
Rendez vous sur : http://157.159.110.248:8081/lam puis connectez vous avec les identifiants admin du LDAP. Vous pourrez alors gérer le LDAP dans son intégralité et importer des utilisateurs au format CSV.

## Déploiement d'un cluster OKD sur proxmox (Eléments théoriques)

### Ports

#### Introduction

Il y a un certain nombre de ports à ouvrir pour que le cluster fonctionne.

#### Les ports à ouvrir

Voici les ports à ouvrir. Certaines doivent être accessibles par les nœuds et d'autres par les client externes. Ce tableau est extrait de la documentation officielle d'OKD et a été complétée pour notre cas d'usage.

#### 1/ Machine à machine

| Port/Potocol        | Description                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| ICMP                | Network reachability tests                                                                                         |
| 9000-9999/TCP       | Host level services, including the node exporter on ports 9100-9101 and the Cluster Version Operator on port 9099. |
| 10250-10259/TCP     | The default ports that Kubernetes reserves.                                                                        |
| 4789/UDP            | VXLAN and Geneve                                                                                                   |
| 6081/UDP            | VXLAN and Geneve                                                                                                   |
| 9000-9999/UDP       | Host level services, including the node exporter on ports 9100-9101.                                               |
| 30000-32767/TCP-UDP | Kubernetes node port                                                                                               |

#### 2/ Machines aux machines de contrôle

| Port/Potocol  | Description                          |
| ------------- | ------------------------------------ |
| 2379-2380/TCP | etcd server, peer, and metrics ports |
| 6443/TCP      | Kubernetes API                       |

#### 3/ Vers la machines Services

| Port/Potocol | Back-end machines (pool members) for load balancer                                                                                                                                                                                     | Internal | External | Description                          |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ------------------------------------ |
| 6443/TCP     | Bootstrap and control plane. You remove the bootstrap machine from the load balancer after the bootstrap machine initializes the cluster control plane. You must configure the /readyz endpoint for the API server health check probe. | X        | X        | Load Balancer: Kubernetes API server |
| 22623/TCP    | Bootstrap and control plane. You remove the bootstrap machine from the load balancer after the bootstrap machine initializes the cluster control plane.                                                                                | X        |          | Load Balancer: Machine config server |
| 443/TCP      | The machines that run the Ingress router pods, compute, or worker, by default.                                                                                                                                                         | X        | X        | Load Balancer: HTTPS                 |
| 80/TCP       | The machines that run the Ingress router pods, compute, or worker, by default.                                                                                                                                                         | X        | X        | Load Balancer: HTTP                  |
| 4789/UDP     | /                                                                                                                                                                                                                                      | X        | X        | VXLAN inter-site                     |
| 67-68/UDP    | /                                                                                                                                                                                                                                      | X        |          | DHCP                                 |
| 8080/TCP     | /                                                                                                                                                                                                                                      | X        |          | Web server to get ignition files     |
| 53/UDP       | /                                                                                                                                                                                                                                      | X        | X        | DNS (see DNS part)                   |

### DNS

#### Introduction

Il y a deux DNS dans le cluster, un interne et relatif aux conteneurs/services. Un externe et relatif aux nœuds (VM). Ici, nous parlons du deuxième étant donné que le premier est crée d'office et sans intervention.

#### Entrées DNS

Voici les entrées nécessaires dans le DNS. Certaines doivent être accessibles par les noeuds et d'autres par les client externes. Ce tableau est extrait de la documentation officielle d'OKD.

| Component      | Record                                    | Description                                                                                                                                                                                                                                                                                       |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kubernetes API | api.<cluster_name>.<base_domain>.         | Add a DNS A/AAAA or CNAME record, and a DNS PTR record, to identify the load balancer for the control plane machines. These records must be resolvable by both clients external to the cluster and from all the nodes within the cluster.                                                         |
| Kubernetes API | api-int.<cluster_name>.<base_domain>.     | Add a DNS A/AAAA or CNAME record, and a DNS PTR record, to identify the load balancer for the control plane machines. These records must be resolvable from all the nodes within the cluster.                                                                                                     |
| Routes         | \*.apps.<cluster_name>.<base_domain>.     | Add a wildcard DNS A/AAAA or CNAME record that refers to the load balancer that targets the machines that run the Ingress router pods, which are the worker nodes by default. These records must be resolvable by both clients external to the cluster and from all the nodes within the cluster. |
| Bootstrap      | bootstrap.<cluster_name>.<base_domain>.   | Add a DNS A/AAAA or CNAME record, and a DNS PTR record, to identify the bootstrap machine. These records must be resolvable by the nodes within the cluster.                                                                                                                                      |
| Master hosts   | <master><n>.<cluster_name>.<base_domain>. | Add DNS A/AAAA or CNAME records and DNS PTR records to identify each machine for the master nodes. These records must be resolvable by the nodes within the cluster.                                                                                                                              |
| Worker hosts   | <worker><n>.<cluster_name>.<base_domain>. | Add DNS A/AAAA or CNAME records and DNS PTR records to identify each machine for the worker nodes. These records must be resolvable by the nodes within the cluster.                                                                                                                              |

### VxLAN

Nous avons décidé d'utiliser VxLAN pour interconnecter les différents sites. Nous présentons dans cette partie une introduction simple à VxLAN puis les choses mises en place pour avoir une interconnexion fonctionnelle entre les sites.

#### Introduction

VXLAN (Virtual Extensible LAN) est un protocole permettant une communication de couche 2 via une liaison de niveau 4 grâce à une encapsulation. Les interfaces s'occupant d'encapsuler et décapsuler s'appellent les VTEPs (VXLAN tunnel endpoint). **Ce protocole n'offre pas de moyen de chiffrer les échanges**. Ce protocole nous permet de faire communiquer les nœuds du cluster via IP locale.

L'encapsulation VXLAN ajoutant 16 octets d'en tête dans le paquet IP, il faut prendre cela en compte lors de la configuration des interfaces réseaux. Voici un flux typique de "routage" de paquet entre 2 conteneurs d'OKD sur 2 sites différents pour le SDN OpenShift CNI:

On considère A et B 2 conteneurs OKD sur des sites distincts. Un flux de paquets typique entre A et B est:

```mermaid
graph LR
B[VethA] --> C[br0]
C --> D[vxlan0]
D --> E[vxlan10]
E --> F[WAN]
F --> G[vxlan10]
G --> H[vxlan0]
H --> I[br0]
I --> J[VethB]
```

De plus, d'après la RFC7348 (https://tools.ietf.org/html/rfc7348) :

```
  VTEPs MUST NOT fragment VXLAN packets.  Intermediate routers may
  fragment encapsulated VXLAN packets due to the larger frame size.
  The destination VTEP MAY silently discard such VXLAN fragments.  To
  ensure end-to-end traffic delivery without fragmentation, it is
  RECOMMENDED that the MTUs (Maximum Transmission Units) across the
  physical network infrastructure be set to a value that accommodates
  the larger frame size due to the encapsulation.
```

De ce fait, on définit un MTU de 1400 octets pour les communications dans le cluster et 1450 octets sur les interfaces des noeuds. De ce fait, lorsque le paquet sort du 2ème VTEP, le MTU de base de 1500 octets n'est pas dépassé.
La communication peut donc se faire sans problème de fragmentation de paquet et sans avoir à faire des modifications sur le WAN pour une augmentation du MTU.

## Troubleshooting (Eclipse CHE)

### Où regarder ?

#### 1) Pour chaque workspace

Pour les informations relatives à chacun des workspace, les informations se trouvent dans `View > Output`.

#### 2) Pour eclipe che en général

Concernant chaque operateur, pour trouver leurs logs il faut naviguer à travers les pods dans `Workloads > Pods`. On y trouve alors plusieurs pods pour différentes tâches de chaque opérateur, en cliquant sur l'un d'entre eux et en se rendant dans l'onglet `Logs` on obtient alors les logs du pod concerné.

### Quels sont les problèmes recontrés ?

#### Terminal qui ne s'affiche pas sous Firefox

<ins>Bug</ins> : Il arrive que le terminal d'un workspace ne s'affiche pas sous firefox.
<ins>Commentaire</ins> : Le bug a été reconnu en tant qu'issue sur le github officiel du projet eclipse che [#13736](https://github.com/eclipse/che/issues/13736).
<ins>Correctif</ins> : Le problème viendrait d'une ancienne version de Firefox, une mise à jour est donc nécessaire. Autrement, désactiver "csp" semble aussi régler le problème.

#### Problème d'autorisation d'accès aux informations du pod

<ins>Bug</ins> : Lors de l'exécution de certaines tâches, le workspace tente d'accèder aux informations du pod et n'y parvient pas
<ins>Commentaire</ins> : Le bug a été reconnu en tant qu'issue sur le github officiel du projet eclipse che [#18812](https://github.com/eclipse/che/issues/18812).
<ins>Correctif</ins> : Les permissions sont bien établies (accessibles depuis [ce lien](https://che-eclipse-che.apps.paasdf.157.159.110.248.nip.io/swagger/#!/permissions)). Le problème n'a pas de correctif pour le moment, mais devrait être corrigé pour la prochaine mise à jour d'eclipse che [#19331](https://github.com/eclipse/che/issues/19331).

##### Dashboard vide

<ins>Bug</ins> : Après une manipulation (à déterminer) le dashboard n'affiche plus rien excépté `ChunkLoadError: Loading chunk 0 failed`.
<ins>Commentaire</ins> : Aucun commentaire sur le bug pour le moment.
<ins>Correctif</ins> : Rafraîchir la page semble résoudre le problème.

## Authentification et utilisation de Keycloak / Shibboleth :

### Mise en place de Shibboleth :

En utilisant l'authentification fédérée de Shibboleth permet d'ouvir la connexion à une instance Pod à toute personne possédant un compte dans une fédération Shibboleth, justement ce qui nous intéresse ici pour l'authentificatin grâce à la Fédération Education - Recherche Renater.
Ainsi, il faut d'abord commencer par l'installation d'un Service Provider Shibboleth, puisque chaque application doit posséder son propre Service Provider.

#### Mise en place du Service Provider (SP) :

On utilisera ici le LDAP définit plus tôt : rendez-vous sur : http://157.159.110.248:8081/lam pour l'interface graphique de Ldap Manager)

### Installation de Shibboleth :

Shibboleth IdP est un servlet JAVA qui va utiliser n'importe quel Java ervlet 2.4 Container (On va utiliser Apache-Tomcat ici).
Commençons par l'installation de Java :

```
apt install java-1.8.0-openjdk
apt install java-1.8.0
```

Par la suite, installons les paquets nécessaires au serveur tomcat et donnons les accès à un nouvel utilisateur tomcat pour qu'il puisse toucher à tous les dossiers nécessaires :

```
apt install tomcat9
/usr/sbin/useradd tomcat
chown tomcat /etc/init.d/tomcat9
chmod 755 /etc/init.d/tomcat9
chmod +x tomcat/bin/*.sh
chown -R tomcat /etc/tomcat9
```

Par la suite, il va falloir configurer un fichier XML qui va permettre de déployer une brique Shibboleth IdP sans avoir à faire un lien symbolique ou un appel continu. Ainsi, nous allons créer un nouveau dossier et un nouveau fichier :

```
mkdir -p /etc/tomcat9/Catalina/localhost/
nano /etc/tomcat9/Catalina/localhost/idp.xml
```

```
            /etc/tomcat9/Catalina/localhost/idp.xml
<Context docBase="/opt/shibboleth-idp/war/idp.war" privileged="true" antiResourceLocking="false"                               antiJARLocking="false"                                                                                                  unpackWAR="false" />
```

Installons maintenant Shibboleth et donnons le droit à tomcat d'accéder à ces fichiers-ci :

```
mkdir /opt/src
cd /opt/src/
wget https://shibboleth.net/downloads/identity-provider/latest4/shibboleth-identity-provider-4.1.2.zip
wget https://shibboleth.net/downloads/identity-provider/latest4/shibboleth-identity-provider-4.1.2.zip.asc
unzip shibboleth-identity-provider-4.1.2.zip
cd shibboleth-identity-provider-4.1.2
./install.sh
chown -R tomcat /opt/shibboleth-idp/
```

Grâce au lien fait avec idp.xml, normalement, si le serveur tomcat est restart, nous pourrons voir que l'idp est bien inclus dans les applications. Pour ceci, nous allons simplement installer le paquet de gestion de tomcat, pour pouvoir avoir accès à l'interface manager de tomcat.

```
apt install tomcat9-admin
```

On peut alors y accéder, mais nous préférons garder cette plateforme manager accessible uniquement au "manager", c'est à dire en local à partir de la machine. Ainsi, pour y avoir accès, nous allons changer notre commande de ssh pour "ramener" le localhost sur notre machine.

```
ssh -L 8080:localhost:8080 157.159.110.39
```

On peut maintenant avoir accès à la page manager de tomcat et on voit bien la présence de idp dans l'application list : http://localhost:8080/manager/html (Les identifiants sont trouvables au niveau de /etc/tomcat9/tomcat-users.xml)

### Configuration de la brique Shibboleth-idp :

#### Activation du LDAP :

Commençons d'abord par activer l'authentification par utilisation du LDAP : LDAPCredentialValidator. On va alors commencer par activer le bean au niveau du /opt/shibboleth-idp/conf/authn/password-authn-config.xml

```
                     /opt/shibboleth-idp/conf/authn/password-authn-config.xml
   <util:list id="shibboleth.authn.Password.Validators">                                                                       <ref bean="shibboleth.LDAPValidator" />                                                                                 <!-- <ref bean="shibboleth.KerberosValidator" /> -->                                                                    <!-- <ref bean="shibboleth.JAASValidator" /> -->                                                                        <!-- <bean parent="shibboleth.HTPasswdValidator" p:resource="%{idp.home}/credentials/demo.htpasswd" /> -->          </util:list>                                                                                                                                                                                                                                    <!-- Apply any regular expression replacement pairs to username before validation. -->                                  <util:list id="shibboleth.authn.Password.Transforms">                                                                       <!--                                                                                                                    <bean parent="shibboleth.Pair" p:first="^(.+)@example\.org$" p:second="$1" />                                           -->                                                                                                                 </util:list>
```

#### Configuration de Shibboleth pour le LDAP :

Pour cette partie, j'utiliserai ce projet : https://github.com/mesosphere-backup/docker-containers/tree/master/shibboleth-idp .
En effet, pour pouvoir bien comprendre la configuration de Shibboleth (Qui, il faut l'avouer, est plutôt hasardeuse, avec peu de documentation précise ou à jour sur internet).
Ainsi, certains changements doivent être faits au niveau des deux fichiers :
_ `shibboleth-idp/conf/ldap.properties`
_ `shibboleth-idp/conf/attribute-resolver.xml`

- ldap.properties :
  Voici les changements faits : (Commentés pour essayer de comprendre le fonctionnement de ce fichier de configuration).
  ![image](https://user-images.githubusercontent.com/77978692/121250211-bfebe900-c8a5-11eb-9a60-94b9f680c6c9.png)
  ![image](https://user-images.githubusercontent.com/77978692/121250278-d5f9a980-c8a5-11eb-8d14-1be87d6967d4.png)

- attribute-resolver :
  ![image](https://user-images.githubusercontent.com/77978692/121250918-91bad900-c8a6-11eb-8fe2-4901ee35a190.png)

#### Utilisation d'OIDC :

Pour notre plus grand bonheur, un plugin OIDC OP est déjà disponible au téléchargement libre.
Commençons ainsi par télécharger OIDCCommon : https://wiki.shibboleth.net/confluence/display/IDPPLUGINS/OIDCCommon
Téléchargeons alors nos deux plugins

```
 wget https://shibboleth.net/downloads/identity-provider/plugins/oidc-common/1.1.0/oidc-common-dist-1.1.0.tar.gz
 wget https://shibboleth.net/downloads/identity-provider/plugins/oidc-common/1.1.0/oidc-common-dist-1.1.0.tar.gz.sha256
 wget https://shibboleth.net/downloads/identity-provider/plugins/oidc-op/3.0.1/idp-plugin-oidc-op-distribution-3.0.1.tar.gz.sha256
 wget https://shibboleth.net/downloads/identity-provider/plugins/oidc-op/3.0.1/idp-plugin-oidc-op-distribution-3.0.1.tar.gz
 /opt/shibboleth-idp/bin/plugin.sh -i oidc-common-dist-1.1.0.tar.gz
 /opt/shibboleth-idp/bin/plugin.sh -i idp-plugin-oidc-op-distribution-3.0.1.tar.gz
```

Normalement, le module est déjà activé, mais il est possible de s'en assurer grace à la commande suivante (Et de l'enable après).

```
/opt/shibboleth-idp/bin/module.sh -l
/opt/shibboleth-idp/bin/module.sh -e idp.oidc.OP
```

Place maintenant à la configuration :
Commençons maintenant par importer la chose au niveau des credentials :

```
              conf/credentials.xml
<!-- OIDC extension default credential definitions -->
<import resource="oidc-credentials.xml" />
```

Ce plugin utilise des clés au format JWK. Bien heureusement, il existe des scripts déjà tout faits pour la génération de ces dernières.

```
cd /opt/shibboleth-idp
bin/jwtgen.sh -t RSA -s 2048 -u sig -i defaultRSASign | tail -n +2 > credentials/idp-signing-rs.jwk
bin/jwtgen.sh -t EC -c P-256 -u sig -i defaultECSign | tail -n +2 > credentials/idp-signing-es.jwk
bin/jwtgen.sh -t RSA -s 2048 -u enc -i defaultRSAEnc | tail -n +2 > credentials/idp-encryption-rsa.jwk
```

Place maintenant à l'issuer, ce qui va nous permettre d'associer dynamiquement un FI à l'utilisateur.

```
             conf/oidc.properties
idp.oidc.issuer = http://localhost:8080/idp/profile/oidc/discovery
```

Maintenant, passons à la configuration du Relying Party :
Dans un premier temps, faisons en sorte qu'un des profils soit accessible.

```
             conf/relying-party.xml
<bean id="shibboleth.UnverifiedRelyingParty" parent="RelyingParty">
   <property name="profileConfigurations">
       <list>
           <ref bean="OIDC.Keyset" />
       </list>
   </property>
</bean>
```

Au niveau des RP, pour les tests, il est possible d'utiliser du JSON pour définir le test.
Et ça, ça se fait au niveau de conf/oidc-clientinfo-resolvers.xml

```
<util:list id="shibboleth.oidc.ClientInformationResolvers">
   <ref bean="ExampleFileResolver" />
   <ref bean="ExampleStorageClientInformationResolver" />
</util:list>

<bean id="ExampleFileResolver" parent="shibboleth.oidc.FilesystemClientInformationResolver"
   c:metadata="%{idp.home}/metadata/oidc-client.json" />
```

Et maintenant, il est possible d'utiliser https://openidconnect.net/ pour faire des tests !

#### Et maintenant ?

Il est possible, depuis peu, d'utiliser de nouvelles méthodes d'authentification à part KeyCloak au niveau d'Eclipse Che : https://www.eclipse.org/che/docs/che-7/administration-guide/authenticating-users/

#### Problèmes et bugs :

De nombreux problèmes ont pu être trouvés, tout d'abord avec le format XML qui peut être capricieux à certaines occasions.
L'un des plus gros problèmes se trouve au niveau des logs : Pendant un long moment, et sans le comprendre, nous n'avions pas de logs au niveau de Shibboleth.
Pour résoudre ce problème il a fallu remonter à l'utilisation de systemd et de Debian : En effet, ce dernier n'a aucune raison de connaître initialement le path de Shibboleth, il va alors falloir l'ajouter.

```
systemctl edit tomcat9
```

```
[Service]
ReadWritePaths=/opt/shibboleth-idp/logs/
ReadWritePaths=/opt/shibboleth-idp/metadata/
```

```
systemctl daemon-reload
systemctl restart tomcat9
```

Maintenant, Tomcat est autorisé à accéder aux logs et aux metadata.

Un autre problème a été le fait qu'il existe un dossier qui va overwrite complétement notre configuration du ldap.properties :

     * `shibboleth-idp/credentials/secrets.properties`

Il faut alors bien penser à commenter les lignes au niveau du ldap.bindDNCredential.

# Intégration Eclipse CHE à Moodle via LTI

## Introduction

LTI est un standard établit par l'IMS pour standardiser les communications entre plusieurs plateformes d'éducations (pour en citer certaines Moodle, edX, Canva...). Dans son utilisation la plus simple, LTI est un ensemble d'attributs HTML sécurisé par le protocole Oauth2 (dans la version LTI1.3) ce qui permet déjà d'envoyer des informations de manière sécurisée et fiable mais ce standard est capable de bien plus comme on pourra le voir plus tard.

## Choix de l'application hôte LTI (tool)

### Un mot sur les plugins eclipse che

A la date d'écriture de ce rapport, nous avons rencontré un problème [(#19335)](https://github.com/eclipse/che/issues/19335) nous empêchant de nous pencher sur le développement d'un plugin pour eclipse pour intégrer les fonctionnalités dont nous parlerons par la suite directement au sein d'eclipse che. En revanche, cela est tout à fait possible bien que certains obstacles doivent être surmontés pour y arriver dont notamment :

- Établir le lien entre moodle et le plugin LTI d'eclipse che sachant que le workspace de l'étudiant/utilisateur ne se lance qu'au moment où il le demande (on pourrait imaginer lancer uniquement le workspace et pré-charger le plugin dans la configuration .yaml ce qui est faisable)
- Unicité (ou non) du plugin : étant donné que (comme on le verra plus tard) moodle a besoin d'une URL pour l'hôte de l'application LTI, cette URL est unique et une solution doit donc être trouvée pour rediriger l'URL de moodle sur la bonne URL du plugin à l'intérieur du workspace de l'étudiant

En attendant la résolution des problèmes relatifs aux autorisations utilisateurs au sein d'eclipse CHE (voir [#19335](https://github.com/eclipse/che/issues/19335)), nous avons décidé d'utiliser une API externe qui jouera le rôle de medium entre Moodle et eclipse CHE

### Embarras du choix

En se baladant dans la [documentation officielle de LTI](http://www.imsglobal.org/spec/lti/v1p3/) on se rends vite de compte de la complexité du modèle. D'autant plus que LTI possède énormément de fonctionnalité qui ralentissent les premiers pas dans le standard.

En revanche, et bien heureusement, il existe de nombreuses bibliothèque open-source dans différents langages pour adapter plus facilement ce standard dans notre application hôte (que l'on appellera 'tool' par la suite). Pour ce qui est des langages on retrouve notamment javascript, python, java ou encore php. Et quant aux framework de nombreux exemples disponibles sur github et autres couvrent largement les frameworks les plus populaires dont Flask, Django, Node.js etc...

Pour ce projet nous nous baserons sur Flask, plus précisément sur une version modifiée de [ce repo](https://github.com/ucfopen/lti-template-flask) avec donc la librairie [PyLTI](https://pypi.org/project/PyLTI/).

## Intégration à Moodle

> NB : Une version de moodle est disponible sur docker, ce qui rends le déploiement très facile et suffit parfaitement pour des premiers tests.

### External tool

La première étape pour ajouter notre application à moodle est de construire un cours de test, une fois cela fait on souhaite ajouter une ressource, dans la liste proposée on sélectionne "External tool".

Ce qui nous amène sur la fenêtre de configuration de la ressource qui contient trois éléments essentiels à l'association du tool :

- l'URL
- La "consumer key"
- Le "shared secret"

L'URL, souvent en "/launch" permet d'établir le lien entre moodle et le tool en y communiquant notamment les deux autres éléments (key, secret) qui sont partagés par l'application et moodle.

> :warning: Les navigateurs récents n'aiment pas mélanger les protocoles http/https. Donc si votre instance de moodle est en https assurez vous d'au moins avoir un certificat auto-signé pour votre tool.
>
> :warning: Dans le cas particulier de flask (et plus généralement du module ssl), il n'aime pas du tout les certificats auto-signés. Donc pour les tests évitez complètement le https et faites tout tourner en http.

Une fois que vous avez choisis votre clé et secret entrez les dans le fichier `setting.py` :

```python
PYLTI_CONFIG = {
    'consumers': {
        CONSUMER_KEY: {
            "secret": SHARED_SECRET
        }
```

Une fois la configuration faite, installez les librairies nécessaire avec `pip install -r requirements.txt` ( ce n'est pas obligatoire mais il est préférable de faire ça dans un environnement virtuel ). Exportez ensuite `FLASK_APP=views.py` et `FLASK_ENV=development`. Puis lancez le serveur avec la commande `flask run -h ip.publique.du.serveur -p 3000` (on utilise ici l'ip publique pour éviter les problèmes d'accès avec moodle si moodle et l'API ne sont pas lancés sur la même machine).

Et puis voilà ! C'est tout ce dont nous avons besoin pour avoir une application de base fonctionnelle !
Quand on tente de se rendre sur l'activité qu'on a créé auparavant on devrait être accueilli par la page suivante :

![screen_lti_launch](https://raw.githubusercontent.com/DzeCin/Cassiopee2021/master/source_files/screen_lti_launch.png)

Lors du lancement de la page on remarque aussi tous les attributs LTI avec lesquels on peut jouer pour notre (futur) plug-in :

```json
INFO in views: {
  "oauth_version": "1.0",
  "oauth_nonce": "f52c49f36f4460ea114a65ad3addd410",
  "oauth_timestamp": "1623182761",
  "oauth_consumer_key": "top",
  "user_id": "2",
  "lis_person_sourcedid": "",
  "roles": "Instructor,urn:lti:sysrole:ims/lis/Administrator,urn:lti:instrole:ims/lis/Administrator",
  "context_id": "2",
  "context_label": "CSCTEST",
  "context_title": "Test de cours moodle",
  "resource_link_title": "eclipse che",
  "resource_link_description": "Blue Coral Guide to Magellan's Voyage is an interactive 3D model of his route around the Earth. Freely browse by selecting, dragging, and zooming or step through the grand tour. Each stop along the way contains an optional profile for more detail.",
  "resource_link_id": "1",
  "context_type": "CourseSection",
  "lis_course_section_sourcedid": "",
  "lis_result_sourcedid": "{\"data\":{\"instanceid\":\"1\",\"userid\":\"2\",\"typeid\":null,\"launchid\":1858082915},\"hash\":\"b51fd03d70466b6d0ec3d432c17a69a734bdc6acd683bd741d53d09a218ad589\"}",
  "lis_outcome_service_url": "http://157.159.110.226/mod/lti/service.php",
  "lis_person_name_given": "Admin",
  "lis_person_name_family": "User",
  "lis_person_name_full": "Admin User",
  "ext_user_username": "user",
  "lis_person_contact_email_primary": "user@example.com",
  "launch_presentation_locale": "en",
  "ext_lms": "moodle-2",
  "tool_consumer_info_product_family_code": "moodle",
  "tool_consumer_info_version": "2020110902",
  "oauth_callback": "about:blank",
  "lti_version": "LTI-1p0",
  "lti_message_type": "basic-lti-launch-request",
  "tool_consumer_instance_guid": "157.159.110.226",
  "tool_consumer_instance_name": "New Site",
  "tool_consumer_instance_description": "New Site",
  "launch_presentation_document_target": "window",
  "launch_presentation_return_url": "http://157.159.110.226/mod/lti/return.php?course=2&launch_container=4&instanceid=1&sesskey=DG6DNkALnl",
  "oauth_signature_method": "HMAC-SHA1",
  "oauth_signature": "QilU0if5TEJIj8ztXx2DTChxDNA="
}
```

On remarquera notamment la présence du champ "role" qui permettra d'assigner un environnement en fonction du rôle de l'utilisateur (élève ou professeur).

La fonction chargée de vérifier l'intégrité de l'échange LTI commence son chemin dans la route "launch" :

```python
@app.route('/launch', methods=['POST', 'GET'])
@lti(error=error, request='initial', role='any', app=app)
def launch(lti=lti):
    session['lis_person_name_full'] = request.form.get('lis_person_name_full')
    role = request.form.get('roles')
    app.logger.info(json.dumps(request.form, indent=2))
    return render_template('launch.html', lis_person_name_full=session['lis_person_name_full'], role=role)
```

Rien de bien fou en termes de lti, tout se passe dans le décorateur `@lti` qui nous renvoi dans la bibliothèque PyLTI et le module flask dont voici une portion :

```python
def wrapper(*args, **kwargs):
            """
            Pass LTI reference to function or return error.
            """
            try:
                the_lti = LTI(lti_args, lti_kwargs)
                the_lti.verify()
                the_lti._check_role()
                kwargs['lti'] = the_lti
                return function(*args, **kwargs)
            except LTIException as lti_exception:
                error = lti_kwargs.get('error')
                exception = dict()
                exception['exception'] = lti_exception
                exception['kwargs'] = kwargs
                exception['args'] = args
                return error(exception=exception)

        return wrapper
```

> NB : La forme de la classe est similaire à celle que l'on peut retrouver dans d'autres langages, donc si python pour du web n'est pas votre tasse de thé pas d'inquiétude cette doc devrait quand même vous aider !

On voit qu'un objet `LTI` est créé, c'est le cœur de notre échange. Une fois qu'il a été créé, on vérifie son intégrité avec la méthode `.verify()` et la validité du rôle via `._check_role()` si tout est bon on décore la fonction (launch() dans notre cas).

Il existe de nombreuses méthode pour faciliter les échanges, un autre exemple :

```python
def post_grade(self, grade):
        """
        Post grade to LTI consumer using XML

        :param: grade: 0 <= grade <= 1
        :return: True if post successful and grade valid
        :exception: LTIPostMessageException if call failed
        """
        message_identifier_id = self.message_identifier_id()
        operation = 'replaceResult'
        lis_result_sourcedid = self.lis_result_sourcedid
        score = float(grade)
        if 0 <= score <= 1.0:
            xml = generate_request_xml(
                message_identifier_id, operation, lis_result_sourcedid,
                score)
            ret = post_message(self._consumers(), self.key,
                               self.response_url, xml)
            if not ret:
                raise LTIPostMessageException("Post Message Failed")
            return True

        return False
```

Cette méthode permet de renvoyer une note au "LTI Consumer", moodle dans notre cas. Il existe plusieurs moyen de l'intégrer, un moyen qui permet de profiter des vérifications précédentes est le suivant :

```python
@app.route('/grade', methods=['POST'])
@lti(request='session', error=error, app=app)
def grade(lti=lti):
    """ post grade

    :param lti: the `lti` object from `pylti`
    :return: grade rendered by grade.html template
    """
    lti.post_grade(1)
    return render_template('grade.html')
```

De cette manière on peut mettre à jour la note selon une information qui nous serait renvoyée par eclipse che.
Un exemple d'intégration de cette méthode serait le suivant :

```python
import requests
...
@app.route('/grade', methods=['POST'])
@lti(request='session', error=error, app=app)
def grade(lti=lti):
    headers = {'PRIVATE-TOKEN': '<token>'}
    r = requests.get("https://gitlabens.imtbs-tsp.eu/nom.prenom/projet/-/pipelines/xxx", headers=headers)
    if (r["status"] == "succes") :
        grade = 1
    else :
        grade = 0
    lti.post_grade(grade)
    return render_template('grade.html')
```

Avec eclipse che lié à gitlabens on peut récupérer le résultat d'une pipeline et y accorder une note en fonction du résultat (on peut bien évidemment élaborer, cette solution étant assez radicale).

## Authentification

### SSO

La manière actuelle de se connecter à son espace Eclipse CHE est le SSO proposé par shibboleth. En se connectant à notre espace (via le CAS de Télécom Sudparis par exemple) on a accès à Moodle et par la même occasion on aurait accès à notre espace personnel eclipse che. Et ce soit en s'y rendant directement, soit via moodle qui ajoute un contexte.

Cette solution permet une sécurité optimale étant donné qu'elle repose uniquement sur shibboleth et permet quand même l'intégration LTI, toutefois limité. On peut par exemple faire la chose suivante :

```html
{% if role == 'Learner' %}
<iframe
  width="100%"
  height="600px"
  src="https://che-eclipse-che.apps.paasdf.157.159.110.248.nip.io/dashboard/#/create-workspace?tab=quick-add"
>
  {% else %}
  <iframe
    width="100%"
    height="600px"
    src="https://che-eclipse-che.apps.paasdf.157.159.110.248.nip.io/dashboard/#/create-workspace?tab=custom-workspace"
  >
    {% endif %}
  </iframe>
</iframe>
```

Ce qui permet de renvoyer l'utilisateur vers un workspace (ici uniquement une page du workspace) différent selon le role que possède l'utilisateur.

### Authentification via LTI

Un autre moyen d'identifier un utilisateur, qui pourrait permettre une meilleur intégration pour le reste du réseau de l'IMT serait l'authentification via LTI.
Une des capacités de LTI est d'agir comme une source d'identification de l'utilisateur auprès de l'application cible (tool). Ceci se repose sur une relation de confiance entre le tool (eclipse che) et le consumer (moodle) via l'échange de la clé et du secret.

Cette option n'a pas été creusée pour ce projet mais est intégrable (pourvu que les plugins eclipse che le permettent), la documentation pour réaliser ceci est la suivante : [LTI as a SSO Mechanism](https://www.imsglobal.org/learning-tools-interoperability-sso-mechanism).

# Plugin de visualisation de TP

Etant donné que l'objectif du projet est de centraliser le développement en un
seul endroit afin de simplifier le travail des étudiants, nous avons choisi de
créer un plugin intégré à Eclipse Theia, l'IDE Web utilisé par Eclipse Che,
permettant la lecture des TP de CSC4101 en parallèle du développement.

Pour créer cette solution, nous nous sommes inspirés des solutions de labos
en ligne comme [NRE Labs](https://nrelabs.io/), proposant un environnement
containerisé dans lequel l'apprenant peut essayer les commandes et réaliser
des exercices, ainsi qu'un énoncé navigable avec des boutons Previous et Next.

Actuellement, les TP sont présentés sous forme de pages Web comme [celle-ci](https://www-inf.telecom-sudparis.eu/COURS/CSC4101/tp-01/), générées à partir de fichiers _org-mode_. Nous voulions initialement utiliser directement les fichiers .org pour créer les TP visualisables, cependant Olivier Berger nous a indiqué qu'il serait plus simple de parser les fichiers HTML directement.

## Implémentation

Le visualiseur prend la forme d'une extension Visual Studio Code, car cela est plus simple à tester en local et car Eclipse Che est compatible avec les plugins VSCode, comme en attestent les plugins PHP inclus dans le _devfile_ CSC4101.

On crée une extension VS Code avec les commandes :

```bash
$ npm install -g yo generator-code
$ yo code

# ? What type of extension do you want to create? New Extension (TypeScript)
# ? What's the name of your extension? TPVisualizer
### Press <Enter> to choose default for all options below ###

# ? What's the identifier of your extension? tpvisualizer
# ? What's the description of your extension? LEAVE BLANK
# ? Initialize a git repository? Yes
# ? Bundle the source code with webpack? No
# ? Which package manager to use? npm

code ./tpvisualizer
```

Yeoman (`yo`) crée alors un dossier dans lequel on peut développer en TypeScript, variant typé de JavaScript. En ouvrant VS Code dans ce nouveau dossier, il suffit de lancer le débuggage avec F5 pour ouvrir une nouvelle instance de VS Code exécutant l'extension.

## Parsing d'un sujet de TP

Un sujet de TP généré en HTML suivant les pratiques de ce [repo GitLab](https://gitlab.com/olberger/org-teaching/-/tree/master/examples) prend la forme suivante :

- Le titre et le sous-titre du TP sont contenus dans une balise `h1` avec la classe `title`.
- Chaque étape du TP est contenue dans une `div` de classe `outline-2`.
  - Son titre est contenu dans une balise `h2`.
  - Sa description est contenue dans une `div` de classe `outline-text-2`.
  - Chaque sous-étape (par exemple étape 2.b) est contenue dans une `div` de classe `outline-3`.

Pour que l'extension puisse être mise à jour plus facilement, nous avons décidé de parser les fichiers HTML au niveau du client, plutôt que de les "pré-parser".

## Fonctionnement de l'extension `TPVisualizer`

VS Code est un IDE sécurisé et bien isolé. Les webviews des extensions, c'est-à-dire les onglets affichant du contenu HTML, n'ont pas beaucoup de droits, par exemple elles ne peuvent accéder directement à des fichiers locaux. Pour utiliser des fichiers locaux et communiquer avec l'extension, on utilise des messages. Ces messages sont des objets JavaScript quelconques pouvant contenir toutes sortes d'informations, et peuvent transiter dans les deux sens, c'est-à-dire de l'extension à la webview ou de la webview à l'extension.

Au lancement de l'extension, on demande à l'utilisateur de choisir un TP parmi une liste établie dans le fichier `tpList.ts`. Une fois le TP choisi, l'extension lit le fichier HTML correspondant, le parse avec le module `node-html-parser` (donnant une variable de type `HTMLElement`) et la fonction `passTpToWebview(webview: vscode.Webview, tp: HTMLElement)` segmente le TP en différentes étapes et sous-étapes, avant d'envoyer un objet de type `TP` (défini dans `types.ts`) à la webview.

Dans la webview, le script contenu dans `app/index.html` affiche le TP étape par étape, et permet la navigation avec les boutons Précédent et Suivant. Dans l'ensemble, la solution marche plutôt bien, avec chaque TP navigable grâce au parsing effectué par l'extension. Une amélioration possible serait la conception d'un design en CSS pour les TP : cela a été essayé avec Bootstrap, cependant la gestion des fichiers locaux de VS Code rend la tâche compliquée.

---

### Aide pour tester moodle

#### Ajouter un utilisateur à un cours

Site administration > Courses > Manage course and category management
Ensuite sélectionner le cours puis cliquer sur "Enrolled Users" et ajouter des étudiants via le bouton en haut/bas à droite.

### Sources

(1) - [Guide: Installing an OKD 4.5 Cluster](https://itnext.io/guide-installing-an-okd-4-5-cluster-508a2631cbee)
