"""Module defining the Cluster class"""

from proxmoxer import ProxmoxAPI


class Cluster:
    """
    Cluster class defining an OKD cluster
    """

    def __init__(self, hostname, user, token_name, token_value):
        self.proxmox = ProxmoxAPI(
            hostname,
            user=user,
            token_name=token_name,
            token_value=token_value,
            verify_ssl=False,
        )

    def gen_min_cluster(self, node):
        """
        Generates a minimal OKD cluster based on the official documentation.
        :return:
        """
        self.create_bootstrap(node)
        for i in range(1, 4):
            self.create_master(i, node)
        for i in range(1, 3):
            self.create_worker(i, node)

    def create_bootstrap(self, node):
        """
        Generates a bootstrap machine
        :param node: name of the physical node on which the VM will be created.
        :return:
        """
        next_vmid = int(self.proxmox.cluster.nextid.get())

        self.proxmox.nodes(node).qemu.create(
            name="bootstrap",
            vmid=next_vmid,
            memory=16368,
            sockets=2,
            cores=2,
            storage="local-lvm",
            onboot=0,
            ide2="file=local:iso/fedora-coreos-33.20210104.3.0-live.x86_64.iso,media=cdrom",
            scsihw="virtio-scsi-pci",
            scsi0="file=local-lvm:120",
            net0="model=virtio,bridge=vmbr1",
            # args='-fw_cfg name=opt/coreos.inst.ignition_url
            # ,string=http://10.0.0.1:8080/ignition/bootstrap.ign '
            #     '-fw_cfg name=opt/coreos.inst.install_dev,string=sda',
        )

    def create_master(self, rank, node):

        """
        Generates a master (or control) node.
        :param node: name of the physical node on which the VM will be created.
        :param rank: name will be master{rank}.
        :return:
        """

        next_vmid = int(self.proxmox.cluster.nextid.get())

        self.proxmox.nodes(node).qemu.create(
            name="master" + str(rank),
            vmid=next_vmid,
            memory=20480,
            sockets=2,
            cores=4,
            storage="testdirstor",
            onboot=1,
            ide2="file=local:iso/fedora-coreos-33.20210104.3.0-live.x86_64.iso,media=cdrom",
            scsihw="virtio-scsi-pci",
            scsi0="file=testdirstor:120",
            net0="model=virtio,bridge=vmbr1",
            # args='-fw_cfg name=opt/coreos.inst.ignition_url
            # ,string=http://10.0.0.1:8080/ignition/master.ign '
            #     '-fw_cfg name=opt/coreos.inst.install_dev,string=sda',
        )

    def create_worker(self, rank, node):
        """
        Generates a worker (or compute) node.
        :param node: name of the physical node on which the VM will be created.
        :param rank: name will be worker{rank}.
        :return:
        """
        next_vmid = int(self.proxmox.cluster.nextid.get())
        self.proxmox.nodes(node).qemu.create(
            name="worker" + str(rank),
            vmid=next_vmid,
            memory=16384,
            sockets=2,
            cores=4,
            storage="testdirstor",
            onboot=1,
            ide2="file=local:iso/fedora-coreos-33.20210104.3.0-live.x86_64.iso,media=cdrom",
            scsihw="virtio-scsi-pci",
            scsi0="file=testdirstor:120",
            net0="model=virtio,bridge=vmbr1",
            # args='-fw_cfg name=opt/coreos.inst.ignition_url
            # ,string=http://10.0.0.1:8080/ignition/worker.ign '
            #     '-fw_cfg name=opt/coreos.inst.install_dev,string=sda',
        )
