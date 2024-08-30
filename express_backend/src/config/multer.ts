import multer from 'multer';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const fileExtension = file.originalname.split('.').pop();
      if(['docx'].includes(fileExtension?fileExtension.toLowerCase():'')) {
        cb(null, `uploads/${req.body.workspace}/temp`);
      }else{
        cb(null, `uploads/${req.body.workspace}`);
      }
    },

    filename: (req, _, cb) => {
      cb(null, req.params.itemId);
    }
  });
  
export const uploader = multer({
  storage:storage,
  fileFilter: (_, file, cb) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    if (file.originalname.includes('../')) {
      return 'El nombre del archivo no puede contener "../"';
    }
    return cb(null, true);
  }
});



