import importlib.util,json,tempfile,unittest,copy
from pathlib import Path
spec=importlib.util.spec_from_file_location('studio',Path(__file__).resolve().parents[1]/'scripts/studio.py');studio=importlib.util.module_from_spec(spec);spec.loader.exec_module(studio)
class Versions(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
  (self.root/'workspace/references').mkdir(parents=True)
 def tearDown(self):self.tmp.cleanup()
 def test_restore_preserves_sources_assets_and_new_photos(self):
  (self.root/'source.blend').write_bytes(b'editable first');(self.root/'texture.png').write_bytes(b'texture first')
  studio.write_json(self.root/'workspace/project.json',studio.DEFAULT)
  saved=studio.snapshot('before edit',self.root)
  (self.root/'source.blend').write_bytes(b'edited');(self.root/'new.js').write_text('new code')
  (self.root/'workspace/references/extra.jpg').write_bytes(b'user photo')
  result=studio.restore(saved['id'],self.root)
  self.assertEqual((self.root/'source.blend').read_bytes(),b'editable first');self.assertEqual((self.root/'texture.png').read_bytes(),b'texture first')
  self.assertTrue((self.root/'workspace/references/extra.jpg').exists());self.assertFalse((self.root/'new.js').exists())
  self.assertTrue((self.root/'.recovery'/result['safetyVersion']/'new.js').exists())
  studio.restore(result['safetyVersion'],self.root);self.assertEqual((self.root/'source.blend').read_bytes(),b'edited')
 def test_corruption_aborts_before_any_restore(self):
  p=self.root/'room.blend';p.write_bytes(b'first');v=studio.snapshot('version',self.root);p.write_bytes(b'keep latest')
  manifest=json.loads((self.root/'.versions/manifests'/(v['id']+'.json')).read_text());digest=manifest['files']['room.blend']['sha256'];(self.root/'.versions/objects'/digest[:2]/digest[2:]).write_bytes(b'corrupt')
  with self.assertRaises(ValueError):studio.restore(v['id'],self.root)
  self.assertEqual(p.read_bytes(),b'keep latest')
 def test_snapshot_blocks_path_escape(self):
  studio.write_json(self.root/'.versions/manifests/evil.json',{'files':{'../outside':{'sha256':'00','mode':420}}})
  with self.assertRaises(ValueError):studio.restore('evil',self.root)
 def test_init_never_replaces_existing_work(self):
  first=studio.init('zh','My personal room',self.root);studio.init('en','Example',self.root)
  self.assertEqual(studio.project(self.root),first)
 def test_modeling_requires_user_layout_and_dimensions(self):
  studio.init(root=self.root)
  with self.assertRaisesRegex(ValueError,'Confirm'):studio.build(self.root)
 def test_no_secrets_or_symlink_targets_in_snapshot(self):
  (self.root/'.env').write_text('private token');(self.root/'external').symlink_to('/etc/hosts');(self.root/'app.js').write_text('hello')
  names=[n for _,n in studio.tracked_files(self.root)]
  self.assertNotIn('.env',names);self.assertNotIn('external',names);self.assertIn('app.js',names)
if __name__=='__main__':unittest.main()
