from pathlib import Path

import yaml


class CloudFormationLoader(yaml.SafeLoader):
    pass


def cloudformation_tag(loader, tag_suffix, node):
    if isinstance(node, yaml.ScalarNode):
        return loader.construct_scalar(node)
    if isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node)
    return loader.construct_mapping(node)


CloudFormationLoader.add_multi_constructor("!", cloudformation_tag)

path = Path("infra/goall26-aws.yaml")
with path.open(encoding="utf-8") as handle:
    yaml.load(handle, Loader=CloudFormationLoader)
print("CloudFormation YAML syntax OK")
