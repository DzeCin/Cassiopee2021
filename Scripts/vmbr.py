"""Module defining the Vmbr class"""

from proxmoxer import ProxmoxAPI
from proxmoxer import ResourceException


class Vmbr:
    """
    Vmbr class defining an Proxmox vmbr
    """

    def __init__(self, hostname, user, token_name, token_value):
        self.proxmox = ProxmoxAPI(
            hostname,
            user=user,
            token_name=token_name,
            token_value=token_value,
            verify_ssl=False,
        )

    def create_vmbr(self, number):
        for i in self.proxmox.nodes.get():
            self.proxmox.nodes(i["node"]).network.create(
                iface="vmbr" + str(number),
                type="bridge"
            )

            try:
                self.proxmox.nodes(i["node"]).network.put()
            except ResourceException as e:
                print(str(e) + "===> Processing without reloading configuration, you will have to reboot your nodes")
            print("Vmbr created on " + i["node"])
